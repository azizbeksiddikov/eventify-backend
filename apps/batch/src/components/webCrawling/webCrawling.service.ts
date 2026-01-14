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
import { OllamaService } from '../ollama/ollama.service';
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
		private readonly ollamaService: OllamaService,
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
		stats: { scraped: number; accepted: number; rejected: number; saved: number };
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
		};

		const processedEvents: Array<{
			name: string;
			url: string;
			categories: string[];
			tags: string[];
			description: string;
		}> = [];

		const logMemory = (label: string) => {
			logger.logMemory(this.context, label);
		};

		try {
			logMemory('START');

			logger.info(this.context, 'Starting Ollama service...');
			await this.ollamaService.startOllama();
			this.ollamaService.markProcessingStart(); // Mark that processing has started
			logger.info(this.context, 'Ollama service initialization complete');
			logMemory('AFTER Ollama Start');

			for (const scraper of this.scrapers) {
				logger.info(this.context, `${'='.repeat(80)}`);
				logger.info(this.context, `Processing ${scraper.getName()}...`);
				logger.info(this.context, `${'='.repeat(80)}`);

				const scraperResult = await this.processScraperSequentially(scraper, limit, testMode || false, logMemory);

				stats.scraped += scraperResult.stats.scraped;
				stats.accepted += scraperResult.stats.accepted;
				stats.rejected += scraperResult.stats.rejected;
				stats.saved += scraperResult.stats.saved;
				processedEvents.push(...scraperResult.events);

				logger.info(this.context, `Finished ${scraper.getName()}`);
				logger.info(this.context, `   Scraped: ${scraperResult.stats.scraped}`);
				logger.info(this.context, `   Accepted: ${scraperResult.stats.accepted}`);
				logger.info(this.context, `   Rejected: ${scraperResult.stats.rejected}`);
				logger.info(this.context, `   Saved to DB: ${scraperResult.stats.saved}`);

				logMemory(`AFTER ${scraper.getName()}`);
			}

			this.saveFinalSummary(stats);

			logMemory('END');
			return { stats, events: processedEvents };
		} catch (error) {
			const errorObj = error instanceof Error ? error : undefined;
			logger.error(this.context, 'Error during web crawling', errorObj);
			throw error;
		} finally {
			// Mark processing as ended before stopping
			this.ollamaService.markProcessingEnd();
			// Unload model cache one last time before stopping
			await this.ollamaService.unloadModelCache();
			// Stop Ollama container to free resources
			await this.ollamaService.stopOllama();
			logMemory('FINAL - After Cleanup');
		}
	}

	/**
	 * Process one scraper with sequential event processing.
	 */
	private async processScraperSequentially(
		scraper: IEventScraper,
		limit: number | undefined,
		testMode: boolean,
		logMemory: (label: string) => void,
	): Promise<{
		stats: { scraped: number; accepted: number; rejected: number; saved: number };
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
			logMemory('AFTER Scraping');

			logger.info(this.context, `Phase 2: Processing events sequentially...`);

			for (let i = 0; i < scrapedEvents.length; i++) {
				const event = scrapedEvents[i];

			try {
				const eventUrl = event.externalUrl ? `\n     URL: ${event.externalUrl}` : '';
				logger.info(
					this.context,
					`  [${i + 1}/${scrapedEvents.length}] Processing: ${event.eventName?.substring(0, 50)}...${eventUrl}`,
				);

			const safetyCheck = await this.llmService.checkEventSafety(event);
				if (!safetyCheck.isSafe) {
					stats.rejected++;
					logger.info(this.context, `     Rejected: ${safetyCheck.reason}`);
					continue;
				}

				const completed = await this.llmService.fillMissingEventData(event);
				stats.accepted++;

				// Add to processed events array
				processedEvents.push({
					name: completed.eventName || 'Unknown',
					url: completed.externalUrl || 'No URL',
					categories: completed.eventCategories || [],
					tags: completed.eventTags || [],
					description: (completed.eventDesc || 'No description').substring(0, 200) + '...',
				});

				// Clean up model cache after each event to free memory (without restarting container)
				await this.ollamaService.unloadModelCache();

				// Check memory usage and restart only if critically high (not actively processing)
				await this.ollamaService.checkAndCleanupMemory();

				if (!testMode) {
					await this.importEventToDatabase(completed);
					stats.saved++;
					logger.info(this.context, `    Saved to DB`);
				} else {
					logger.info(this.context, `    Processed (test mode - not saved)`);
				}
				} catch (error) {
					logger.warn(this.context, `    Failed: ${error instanceof Error ? error.message : String(error)}`);
				}

				if ((i + 1) % 10 === 0) {
					logMemory(`After ${i + 1} events`);
				}
			}

			return { stats, events: processedEvents };
		} catch (error) {
			const errorObj = error instanceof Error ? error : undefined;
			logger.error(this.context, `Error processing ${scraper.getName()}`, errorObj);
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
			logger.warn(this.context, `Failed to import "${event.eventName}"`, error);
			throw error;
		}
	}

	private saveFinalSummary(stats: { scraped: number; accepted: number; rejected: number; saved: number }): void {
		// JSON saving disabled to reduce disk I/O - code kept for debugging purposes
		// Uncomment below to re-enable JSON saving:
		/*
		try {
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
		} catch (error) {
			logger.warn(this.context, 'Failed to save summary', error);
		}
		*/

		// Log summary to console instead
		logger.info(this.context, `Final Summary:`);
		logger.info(this.context, `   Total Scraped: ${stats.scraped}`);
		logger.info(this.context, `   Accepted: ${stats.accepted}`);
		logger.info(this.context, `   Rejected: ${stats.rejected}`);
		logger.info(this.context, `   Saved to DB: ${stats.saved}`);
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
