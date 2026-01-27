import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { Event } from '@app/api/src/libs/dto/event/event';
import { MeetupScraper } from './scrapers/meetup.scraper';
import { LumaScraper } from './scrapers/luma.scraper';
import { IEventScraper, CrawledEvent } from '@app/api/src/libs/dto/event/eventCrawling';
import { LLMService } from '../llm/llm.service';
import { EventStatus, EventType } from '@app/api/src/libs/enums/event.enum';
import { EventInput } from '@app/api/src/libs/dto/event/event.input';
import { AgendaService } from '../../agenda/agenda.service';
import { logger } from '../../libs/logger';

@Injectable()
export class WebCrawlingService {
	private readonly scrapers: IEventScraper[] = [];
	private readonly context = 'WebCrawlingService';

	constructor(
		@InjectModel('Event') private readonly eventModel: Model<Event>,
		private readonly agendaService: AgendaService,
		private readonly meetupScraper: MeetupScraper,
		private readonly lumaScraper: LumaScraper,
		private readonly llmService: LLMService,
	) {
		this.scrapers = [this.meetupScraper, this.lumaScraper];
	}

	/**
	 * Sequential per-event processing to minimize memory usage.
	 * @param limit - Optional limit on number of events to process
	 * @param testMode - If true, events are processed but not saved to DB
	 * @returns Object with stats and processed events data
	 */
	async getEventCrawling(
		limit?: number,
		testMode?: boolean,
	): Promise<{
		stats: {
			scraped: number;
			accepted: number;
			rejected: number;
			saved: number;
			aiProcessed: number;
			aiSkipped: number;
			aiSafetyCheckFailed: number;
			aiDataFillFailed: number;
		};
		events: Array<{
			name: string;
			url: string;
			categories: string[];
			tags: string[];
			description: string;
		}>;
	}> {
		const stats = {
			scraped: 0,
			accepted: 0,
			rejected: 0,
			saved: 0,
			aiProcessed: 0,
			aiSkipped: 0,
			aiSafetyCheckFailed: 0,
			aiDataFillFailed: 0,
		};

		const processedEvents: Array<{
			name: string;
			url: string;
			categories: string[];
			tags: string[];
			description: string;
		}> = [];

		try {
			logger.info(this.context, 'Starting web crawling with Gemini AI...');

			for (const scraper of this.scrapers) {
				logger.info(this.context, `${'='.repeat(80)}`);
				logger.info(this.context, `Starting ${scraper.getName()}`);
				logger.info(this.context, `${'='.repeat(80)}`);

				const scraperResult = await this.processScraperSequentially(scraper, limit, testMode || false);

				stats.scraped += scraperResult.stats.scraped;
				stats.accepted += scraperResult.stats.accepted;
				stats.rejected += scraperResult.stats.rejected;
				stats.saved += scraperResult.stats.saved;
				stats.aiProcessed += scraperResult.stats.aiProcessed;
				stats.aiSkipped += scraperResult.stats.aiSkipped;
				stats.aiSafetyCheckFailed += scraperResult.stats.aiSafetyCheckFailed;
				stats.aiDataFillFailed += scraperResult.stats.aiDataFillFailed;
				processedEvents.push(...scraperResult.events);

				logger.info(this.context, `Completed ${scraper.getName()}`);
				logger.info(this.context, `  Scraped: ${scraperResult.stats.scraped}`);
				logger.info(this.context, `  Accepted: ${scraperResult.stats.accepted}`);
				logger.info(this.context, `  Rejected: ${scraperResult.stats.rejected}`);
				logger.info(this.context, `  Saved: ${scraperResult.stats.saved}`);
				logger.info(this.context, `  AI Processed: ${scraperResult.stats.aiProcessed}`);
				logger.info(this.context, `  AI Skipped: ${scraperResult.stats.aiSkipped}`);
				logger.info(this.context, `  AI Safety Check Failed: ${scraperResult.stats.aiSafetyCheckFailed}`);
				logger.info(this.context, `  AI Data Fill Failed: ${scraperResult.stats.aiDataFillFailed}`);
			}

			this.saveFinalSummary(stats);
			return { stats, events: processedEvents };
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			const errorStack = error instanceof Error ? error.stack : undefined;
			logger.error(this.context, `Fatal error during web crawling: ${errorMessage}`);
			if (errorStack) {
				logger.error(this.context, `Stack trace:\n${errorStack}`);
			}
			throw error;
		}
	}

	/**
	 * Process one scraper with sequential event processing.
	 */
	private async processScraperSequentially(
		scraper: IEventScraper,
		limit: number | undefined,
		testMode: boolean,
	): Promise<{
		stats: {
			scraped: number;
			accepted: number;
			rejected: number;
			saved: number;
			aiProcessed: number;
			aiSkipped: number;
			aiSafetyCheckFailed: number;
			aiDataFillFailed: number;
		};
		events: Array<{
			name: string;
			url: string;
			categories: string[];
			tags: string[];
			description: string;
		}>;
	}> {
		const stats = {
			scraped: 0,
			accepted: 0,
			rejected: 0,
			saved: 0,
			aiProcessed: 0,
			aiSkipped: 0,
			aiSafetyCheckFailed: 0,
			aiDataFillFailed: 0,
		};

		const processedEvents: Array<{
			name: string;
			url: string;
			categories: string[];
			tags: string[];
			description: string;
		}> = [];

		logger.info(this.context, `Phase 1: Scraping events from ${scraper.getName()}...`);

		try {
			const scrapedEvents = await scraper.scrapeEvents(limit);
			stats.scraped = scrapedEvents.length;

			logger.info(this.context, `Scraped ${scrapedEvents.length} events`);
			logger.info(this.context, `Processing events sequentially...`);

			for (let i = 0; i < scrapedEvents.length; i++) {
				const event = scrapedEvents[i];

				logger.info(this.context, `${'─'.repeat(80)}`);
				logger.info(this.context, `[${i + 1}/${scrapedEvents.length}] ${event.eventName || 'Unknown Event'}`);
				logger.info(this.context, `Link: ${event.externalUrl || 'N/A'}`);

				try {
					// Safety check
					const safetyCheck = await this.llmService.checkEventSafety(event);
					if (!safetyCheck.isSafe) {
						stats.rejected++;
						// Track AI safety check failure only if AI was attempted but failed
						// (keyword check rejections don't count as AI failures)
						logger.info(this.context, `Status: REJECTED - ${safetyCheck.reason}`);
						continue;
					}

					// Track AI safety check processing
					let aiProcessedAny = false;
					if (safetyCheck.aiProcessed) {
						aiProcessedAny = true;
					} else {
						// AI was attempted but failed (keyword check passed, but AI call failed)
						stats.aiSafetyCheckFailed++;
					}

					logger.info(this.context, `Status: SAFE${safetyCheck.aiProcessed ? ' (AI verified)' : ' (keyword check)'}`);

					// Before LLM
					const beforeCategories = event.eventCategories?.join(', ') || 'none';
					const beforeTags = event.eventTags?.slice(0, 5).join(', ') || 'none';
					const beforeTagsCount = event.eventTags?.length || 0;
					logger.info(this.context, `Before LLM:`);
					logger.info(this.context, `  Categories: ${beforeCategories}`);
					logger.info(
						this.context,
						`  Tags: ${beforeTags}${beforeTagsCount > 5 ? ` (+${beforeTagsCount - 5} more)` : ''}`,
					);

					// Check if event needs AI processing (missing categories or tags)
					const needsCategories = !event.eventCategories || event.eventCategories.length === 0;
					const needsTags = !event.eventTags || event.eventTags.length === 0;
					const needsAIProcessing = needsCategories || needsTags;

					// LLM Processing
					const fillResult = await this.llmService.fillMissingEventData(event);
					const completed = fillResult.event;

					// Track AI data fill processing
					if (fillResult.aiProcessed) {
						aiProcessedAny = true;
					} else if (needsAIProcessing) {
						// AI processing was needed but failed
						stats.aiDataFillFailed++;
					}

					// Count overall AI processing success
					if (aiProcessedAny) {
						stats.aiProcessed++;
					} else {
						// Count as skipped if AI was needed/attempted but failed
						// Safety check: If aiProcessed=false here (and isSafe=true), it means keyword check passed but AI call failed
						// Data fill: AI was needed but failed
						const safetyCheckAIFailed = !safetyCheck.aiProcessed; // At this point (isSafe=true), false means AI was attempted but failed
						const dataFillAIFailed = needsAIProcessing && !fillResult.aiProcessed;

						if (safetyCheckAIFailed || dataFillAIFailed) {
							stats.aiSkipped++;
						}
					}

					stats.accepted++;

					// After LLM
					const afterCategories = completed.eventCategories?.join(', ') || 'none';
					const afterTags = completed.eventTags?.slice(0, 5).join(', ') || 'none';
					const afterTagsCount = completed.eventTags?.length || 0;
					logger.info(this.context, `After LLM:`);
					logger.info(this.context, `  Categories: ${afterCategories}`);
					logger.info(
						this.context,
						`  Tags: ${afterTags}${afterTagsCount > 5 ? ` (+${afterTagsCount - 5} more)` : ''}`,
					);
					if (!fillResult.aiProcessed) {
						logger.info(this.context, `  AI Status: SKIPPED (AI processing failed or not needed)`);
					}

					// Save
					if (!testMode) {
						await this.importEventToDatabase(completed);
						stats.saved++;
						logger.info(this.context, `Result: SAVED TO DATABASE`);
					} else {
						logger.info(this.context, `Result: PROCESSED (test mode)`);
					}
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : String(error);
					const errorStack = error instanceof Error ? error.stack : undefined;
					logger.error(this.context, `ERROR: ${errorMessage}`);
					if (errorStack) {
						logger.error(this.context, `Stack: ${errorStack}`);
					}
				}
			}

			return { stats, events: processedEvents };
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			const errorStack = error instanceof Error ? error.stack : undefined;
			logger.error(this.context, `Error processing scraper "${scraper.getName()}": ${errorMessage}`);
			if (errorStack) {
				logger.error(this.context, `Stack trace:\n${errorStack}`);
			}
			throw error;
		}
	}

	private async importEventToDatabase(event: CrawledEvent): Promise<void> {
		try {
			const existingEvent = await this.findExistingEvent(event);
			const eventData: EventInput = this.mapCrawledEventToInput(event);

			if (existingEvent) {
				const hasChanges = this.hasEventChanges(existingEvent, eventData);

				if (hasChanges) {
					const updatedEvent = await this.eventModel.findByIdAndUpdate(existingEvent._id, eventData, {
						new: true,
					});

					if (updatedEvent) {
						await this.handleEventJobsAfterImport(existingEvent, updatedEvent);
					}
				}
			} else {
				const newEvent = await this.eventModel.create(eventData);
				await this.scheduleEventJobs(newEvent);
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			const errorStack = error instanceof Error ? error.stack : undefined;
			logger.error(this.context, `Failed to import event "${event.eventName}": ${errorMessage}`);
			if (errorStack) {
				logger.error(this.context, `Stack trace:\n${errorStack}`);
			}
			throw error;
		}
	}

	private saveFinalSummary(stats: {
		scraped: number;
		accepted: number;
		rejected: number;
		saved: number;
		aiProcessed: number;
		aiSkipped: number;
		aiSafetyCheckFailed: number;
		aiDataFillFailed: number;
	}): void {
		// JSON saving disabled to reduce disk I/O - code kept for debugging purposes
		// Uncomment below to re-enable JSON saving:
		try {
			if (process.env.SAVE_JSON_FILES === 'true') {
				const jsonsDir = path.join(process.cwd(), 'jsons');
				if (!fs.existsSync(jsonsDir)) fs.mkdirSync(jsonsDir, { recursive: true });

				const summary = {
					metadata: {
						timestamp: new Date().toISOString(),
						mode: 'optimized_sequential',
					},
					stats,
				};

				const filePath = path.join(jsonsDir, 'crawling_summary.json');
				fs.writeFileSync(filePath, JSON.stringify(summary, null, 2), 'utf-8');
				logger.info(this.context, `Saved summary to jsons/crawling_summary.json`);
			}

			logger.info(this.context, `Final Summary:`);
			logger.info(this.context, `   Total Scraped: ${stats.scraped}`);
			logger.info(this.context, `   Accepted: ${stats.accepted}`);
			logger.info(this.context, `   Rejected: ${stats.rejected}`);
			logger.info(this.context, `   Saved to DB: ${stats.saved}`);
			logger.info(this.context, `   AI Processing:`);
			logger.info(this.context, `     Processed by AI: ${stats.aiProcessed}`);
			logger.info(this.context, `     Skipped (AI failed/not needed): ${stats.aiSkipped}`);
			logger.info(this.context, `     Safety Check Failed: ${stats.aiSafetyCheckFailed}`);
			logger.info(this.context, `     Data Fill Failed: ${stats.aiDataFillFailed}`);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			logger.error(this.context, `Failed to save summary: ${errorMessage}`);
		}
	}

	private async findExistingEvent(event: CrawledEvent): Promise<Event | null> {
		const conditions: any[] = [];

		if (event.externalId) conditions.push({ externalId: event.externalId });
		if (event.externalUrl) conditions.push({ externalUrl: event.externalUrl });

		if (event.eventName && event.eventStartAt) {
			const startDate = new Date(event.eventStartAt);
			const startWindow = {
				$gte: new Date(startDate.getTime() - 60 * 60 * 1000),
				$lte: new Date(startDate.getTime() + 60 * 60 * 1000),
			};

			conditions.push({
				eventName: event.eventName,
				eventStartAt: startWindow,
			});
		}

		if (conditions.length === 0) return null;

		return await this.eventModel.findOne({ $or: conditions });
	}

	private mapCrawledEventToInput(event: CrawledEvent): EventInput {
		return {
			eventType: EventType.ONCE,
			eventName: event.eventName,
			eventDesc: event.eventDesc,
			eventImages: Array.isArray(event.eventImages)
				? event.eventImages.filter((img: string | null | undefined) => img != null)
				: [],
			eventPrice: event.eventPrice || 0,
			eventCurrency: event.eventCurrency,
			eventStartAt: new Date(event.eventStartAt),
			eventEndAt: new Date(event.eventEndAt),
			locationType: event.locationType,
			eventCity: event.eventCity,
			eventAddress: event.eventAddress,
			coordinateLatitude: event.coordinateLatitude,
			coordinateLongitude: event.coordinateLongitude,
			eventStatus: EventStatus.UPCOMING,
			eventCategories: event.eventCategories,
			eventTags: event.eventTags || [],
			isRealEvent: true,
			origin: event.origin || 'external',
			externalId: event.externalId,
			externalUrl: event.externalUrl,
			attendeeCount: event.attendeeCount || undefined,
			eventCapacity: event.eventCapacity || undefined,
		};
	}

	private hasEventChanges(existingEvent: Event, newEventData: EventInput): boolean {
		const normalize = (str: string | undefined | null): string => {
			return (str || '').trim().toLowerCase();
		};

		const isSameDate = (date1: Date | string | undefined, date2: Date | string | undefined): boolean => {
			if (!date1 || !date2) return date1 === date2;
			const d1 = new Date(date1).getTime();
			const d2 = new Date(date2).getTime();
			return Math.abs(d1 - d2) < 1000;
		};

		const isSameArray = (arr1: unknown[] | undefined, arr2: unknown[] | undefined): boolean => {
			if (!arr1 && !arr2) return true;
			if (!arr1 || !arr2) return false;
			if (arr1.length !== arr2.length) return false;
			const sorted1 = [...arr1].sort();
			const sorted2 = [...arr2].sort();
			return sorted1.every((val, idx) => val === sorted2[idx]);
		};

		const checks = [
			normalize(existingEvent.eventName) !== normalize(newEventData.eventName),
			normalize(existingEvent.eventDesc) !== normalize(newEventData.eventDesc),
			!isSameArray(existingEvent.eventImages, newEventData.eventImages),
			!isSameDate(existingEvent.eventStartAt, newEventData.eventStartAt),
			!isSameDate(existingEvent.eventEndAt, newEventData.eventEndAt),
			existingEvent.locationType !== newEventData.locationType,
			normalize(existingEvent.eventCity) !== normalize(newEventData.eventCity),
			normalize(existingEvent.eventAddress) !== normalize(newEventData.eventAddress),
			existingEvent.coordinateLatitude !== newEventData.coordinateLatitude,
			existingEvent.coordinateLongitude !== newEventData.coordinateLongitude,
			existingEvent.eventPrice !== newEventData.eventPrice,
			existingEvent.eventCurrency !== newEventData.eventCurrency,
			existingEvent.eventCapacity !== newEventData.eventCapacity,
			existingEvent.attendeeCount !== newEventData.attendeeCount,
			!isSameArray(existingEvent.eventCategories, newEventData.eventCategories),
			!isSameArray(existingEvent.eventTags, newEventData.eventTags),
			normalize(existingEvent.externalUrl) !== normalize(newEventData.externalUrl),
		];

		return checks.some((hasChange) => hasChange);
	}

	private async scheduleEventJobs(event: Event & { _id: { toString: () => string } }): Promise<void> {
		const now = new Date();
		const startTime = new Date(event.eventStartAt);
		const endTime = new Date(event.eventEndAt);

		if (event.eventStatus === EventStatus.UPCOMING) {
			if (startTime > now) {
				await this.agendaService.scheduleEventStart(event._id.toString(), startTime);
			}

			if (endTime > now) {
				await this.agendaService.scheduleEventEnd(event._id.toString(), endTime);
			}
			return;
		}

		if (event.eventStatus === EventStatus.ONGOING) {
			if (endTime > now) {
				await this.agendaService.scheduleEventEnd(event._id.toString(), endTime);
			}
			return;
		}
	}

	private async handleEventJobsAfterImport(
		oldEvent: Event & { _id: { toString: () => string } },
		updatedEvent: Event & { _id: { toString: () => string } },
	): Promise<void> {
		const oldStatus = oldEvent.eventStatus;
		const newStatus = updatedEvent.eventStatus;
		const now = new Date();

		const timeChanged =
			new Date(oldEvent.eventStartAt).getTime() !== new Date(updatedEvent.eventStartAt).getTime() ||
			new Date(oldEvent.eventEndAt).getTime() !== new Date(updatedEvent.eventEndAt).getTime();

		if (
			newStatus === EventStatus.DELETED ||
			newStatus === EventStatus.CANCELLED ||
			newStatus === EventStatus.COMPLETED
		) {
			await this.agendaService.cancelEventJobs(updatedEvent._id.toString());
			return;
		}

		if (newStatus === EventStatus.ONGOING) {
			await this.agendaService.cancelEventJobs(updatedEvent._id.toString());

			if (new Date(updatedEvent.eventEndAt) > now) {
				await this.agendaService.scheduleEventEnd(updatedEvent._id.toString(), updatedEvent.eventEndAt);
			}
			return;
		}

		if (newStatus === EventStatus.UPCOMING && timeChanged) {
			await this.agendaService.rescheduleEventJobs(
				updatedEvent._id.toString(),
				updatedEvent.eventStartAt,
				updatedEvent.eventEndAt,
			);
			return;
		}

		if (newStatus === EventStatus.UPCOMING && oldStatus !== EventStatus.UPCOMING) {
			await this.scheduleEventJobs(updatedEvent);
			return;
		}
	}
}
