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

@Injectable()
export class WebCrawlingService {
	private readonly scrapers: IEventScraper[] = [];

	constructor(
		@InjectModel('Event') private readonly eventModel: Model<Event>,
		private readonly agendaService: AgendaService,
		private readonly meetupScraper: MeetupScraper,
		private readonly lumaScraper: LumaScraper,

		private readonly llmService: LLMService,
	) {
		// Initialize scrapers
		this.scrapers = [this.meetupScraper, this.lumaScraper];
		// this.scrapers = [this.meetupScraper];
		// this.scrapers = [this.lumaScraper];
	}

	async getEventCrawling(limit?: number, testMode?: boolean): Promise<CrawledEvent[]> {
		const allEvents: CrawledEvent[] = [];
		const scraperResults: { [key: string]: { count: number; events: CrawledEvent[] } } = {};

		try {
			////////////////////////////////////////////////////////////
			// Step 1: Web scraping events
			////////////////////////////////////////////////////////////
			console.log('Start web scraping...');
			let currentLimit = limit;

			for (const scraper of this.scrapers) {
				// Check if we've already reached the limit before calling next scraper
				if (currentLimit !== undefined && currentLimit <= 0) {
					console.log(`Limit reached (${limit}), stopping scraping`);
					break;
				}

				try {
					const events = await scraper.scrapeEvents(currentLimit);

					scraperResults[scraper.getName()] = { count: events.length, events: events };
					allEvents.push(...events);

					// Decrease currentLimit by the number of events scraped
					if (currentLimit !== undefined) currentLimit -= events.length;
				} catch (error) {
					console.error(`Scraper ${scraper.getName()} failed: ${error.message}`, error.stack);
					console.warn(`Continuing with other scrapers...`);
				}
			}

			////////////////////////////////////////////////////////////
			// Step 2: Filter events with LLM + Fill missing data
			////////////////////////////////////////////////////////////
			const { accepted, rejected, reasons } = await this.llmService.filterAndCompleteEvents(allEvents);

			// Apply limit globally after LLM filtering to ensure we return exactly the requested number
			const finalAccepted = limit ? accepted.slice(0, limit) : accepted;

			await this.saveStepToJson('step2_llm', {
				metadata: {
					step: 2,
					description: 'Events after LLM processing',
					processedAt: new Date().toISOString(),
					totalAccepted: accepted.length,
					totalRejected: rejected.length,
					acceptanceRate: allEvents.length > 0 ? `${((accepted.length / allEvents.length) * 100).toFixed(1)}%` : 'N/A',
					llmEnabled: process.env.LLM_ENABLED === 'true',
				},
				acceptedEvents: accepted.map((event) => {
					const { rawData, ...eventWithoutRawData } = event;
					return eventWithoutRawData;
				}),
				rejectedEvents: rejected.map((event) => ({
					eventName: event.eventName,
					externalUrl: event.externalUrl,
					origin: event.origin,
					reason: reasons.get(event.externalId || event.eventName) || 'Unknown',
				})),
			});
			await this.saveAllEventsToJson(allEvents, accepted, rejected, reasons, scraperResults);

			////////////////////////////////////////////////////////////
			// Step 3: Import accepted events to database
			////////////////////////////////////////////////////////////
			let processedCount = 0;
			if (!testMode) {
				processedCount = await this.importEventsToDatabase(finalAccepted);

				await this.saveStepToJson('step3_import_results', {
					metadata: {
						step: 3,
						description: 'Database import results (create/update)',
						importedAt: new Date().toISOString(),
						totalProcessed: processedCount,
						totalEvents: finalAccepted.length,
					},
					summary: {
						processedSuccessfully: processedCount,
						totalEvents: finalAccepted.length,
						note: 'See console logs for breakdown of created/updated/skipped',
					},
				});
			}

			return finalAccepted;
		} catch (error) {
			console.error(`Error during web crawling: ${error.message}`, error.stack);
			throw error;
		}
	}

	private async saveStepToJson(filename: string, data: any): Promise<void> {
		try {
			const jsonsDir = path.join(process.cwd(), 'jsons');
			if (!fs.existsSync(jsonsDir)) fs.mkdirSync(jsonsDir, { recursive: true });

			const filePath = path.join(jsonsDir, `${filename}.json`);
			fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

			console.log(`Saved step to jsons/${filename}.json`);
		} catch (error) {
			console.warn(`Failed to save step JSON file: ${error.message}`);
		}
	}

	private async saveAllEventsToJson(
		rawEvents: CrawledEvent[],
		acceptedEvents: CrawledEvent[],
		rejectedEvents: CrawledEvent[],
		rejectionReasons: Map<string, string>,
		scraperResults: { [key: string]: { count: number; events: CrawledEvent[] } },
	): Promise<void> {
		try {
			const jsonsDir = path.join(process.cwd(), 'jsons');
			if (!fs.existsSync(jsonsDir)) fs.mkdirSync(jsonsDir, { recursive: true });

			const llmEnabled = process.env.LLM_ENABLED === 'true';

			// Prepare combined data with metadata
			const dataToSave = {
				metadata: {
					scrapedAt: new Date().toISOString(),
					totalScraped: rawEvents.length,
					totalAccepted: acceptedEvents.length,
					totalRejected: rejectedEvents.length,
					acceptanceRate:
						rawEvents.length > 0 ? `${((acceptedEvents.length / rawEvents.length) * 100).toFixed(1)}%` : 'N/A',
					sources: Object.keys(scraperResults).map((source) => ({
						name: source,
						eventCount: scraperResults[source].count,
					})),
					llm: {
						enabled: llmEnabled,
						model: process.env.OLLAMA_MODEL,
					},
				},
				acceptedEvents: acceptedEvents.map((event) => {
					const { rawData, ...eventWithoutRawData } = event;
					return eventWithoutRawData;
				}),
				rejectedEvents: rejectedEvents.map((event) => ({
					eventName: event.eventName,
					externalUrl: event.externalUrl,
					origin: event.origin,
					reason: rejectionReasons.get(event.externalId || event.eventName) || 'Unknown',
				})),
			};

			const filePath = path.join(jsonsDir, 'all_events.json');
			fs.writeFileSync(filePath, JSON.stringify(dataToSave, null, 2), 'utf-8');
		} catch (error) {
			console.warn(`Failed to save JSON file: ${error.message}`);
		}
	}

	private async importEventsToDatabase(events: CrawledEvent[]): Promise<number> {
		let created = 0;
		let updated = 0;
		let skipped = 0;

		for (const event of events) {
			try {
				// Check if event already exists using multiple criteria
				const existingEvent = await this.findExistingEvent(event);

				// Map CrawledEvent to Event data
				const eventData: EventInput = this.mapCrawledEventToInput(event);

				if (existingEvent) {
					// Compare existing event with scraped event
					const hasChanges = this.hasEventChanges(existingEvent, eventData);

					if (hasChanges) {
						// Update the event if there are changes
						const updatedEvent = await this.eventModel.findByIdAndUpdate(existingEvent._id, eventData, {
							new: true,
						});

						// Handle job rescheduling for updated events
						if (updatedEvent) {
							await this.handleEventJobsAfterImport(existingEvent, updatedEvent);
						}

						updated++;
						console.log(`Updated: "${event.eventName}" (${event.externalId || 'no-id'})`);
					} else {
						// Skip if no changes
						skipped++;
					}
				} else {
					// Create new event if it doesn't exist
					const newEvent = await this.eventModel.create(eventData);

					// Schedule jobs for newly created events
					await this.scheduleEventJobs(newEvent);

					created++;
					console.log(`Created: "${event.eventName}" (${event.externalId || 'no-id'})`);
				}
			} catch (error) {
				console.warn(`Failed to process "${event.eventName}": ${error.message}`);
			}
		}

		console.log(`Database import complete: ${created} created, ${updated} updated, ${skipped} skipped (no changes)`);
		return created + updated;
	}

	/**
	 * Find existing event by multiple criteria:
	 * 1. External ID (if available)
	 * 2. External URL (if available)
	 * 3. Event name + start time (for events without external IDs)
	 */
	private async findExistingEvent(event: CrawledEvent): Promise<any> {
		const conditions: any[] = [];

		// Check by external ID
		if (event.externalId) conditions.push({ externalId: event.externalId });

		// Check by external URL
		if (event.externalUrl) conditions.push({ externalUrl: event.externalUrl });

		// Check by name + start time (fuzzy match to catch similar events)
		if (event.eventName && event.eventStartAt) {
			const startDate = new Date(event.eventStartAt);
			// Allow 1 hour time difference for matching
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

	/**
	 * Map CrawledEvent to EventInput
	 */
	private mapCrawledEventToInput(event: CrawledEvent): EventInput {
		return {
			// ===== Event Type =====
			eventType: EventType.ONCE, // Default to one-time event

			// ===== Basic Information =====
			eventName: event.eventName,
			eventDesc: event.eventDesc,
			eventImages: event.eventImages || [],
			eventPrice: event.eventPrice || 0,
			eventCurrency: event.eventCurrency,

			// ===== Event Timestamps =====
			eventStartAt: new Date(event.eventStartAt),
			eventEndAt: new Date(event.eventEndAt),

			// ===== Location Details =====
			locationType: event.locationType,
			eventCity: event.eventCity,
			eventAddress: event.eventAddress,
			// Coordinates
			coordinateLatitude: event.coordinateLatitude,
			coordinateLongitude: event.coordinateLongitude,

			// ===== Type and Status =====
			eventStatus: EventStatus.UPCOMING,
			eventCategories: event.eventCategories,
			eventTags: event.eventTags || [],
			isRealEvent: true,

			// ===== External Source Information =====
			origin: event.origin || 'external',
			externalId: event.externalId,
			externalUrl: event.externalUrl,

			// ===== Event Attendees =====
			attendeeCount: event.attendeeCount || undefined,
			eventCapacity: event.eventCapacity || undefined,
		};
	}

	/**
	 * Compare existing event with scraped event data to detect changes
	 * Returns true if there are meaningful differences
	 */
	private hasEventChanges(existingEvent: any, newEventData: EventInput): boolean {
		// Helper to normalize strings for comparison
		const normalize = (str: string | undefined | null): string => {
			return (str || '').trim().toLowerCase();
		};

		// Helper to compare dates (ignore milliseconds)
		const isSameDate = (date1: Date | string | undefined, date2: Date | string | undefined): boolean => {
			if (!date1 || !date2) return date1 === date2;
			const d1 = new Date(date1).getTime();
			const d2 = new Date(date2).getTime();
			// Allow 1 second difference
			return Math.abs(d1 - d2) < 1000;
		};

		// Helper to compare arrays
		const isSameArray = (arr1: any[] | undefined, arr2: any[] | undefined): boolean => {
			if (!arr1 && !arr2) return true;
			if (!arr1 || !arr2) return false;
			if (arr1.length !== arr2.length) return false;
			const sorted1 = [...arr1].sort();
			const sorted2 = [...arr2].sort();
			return sorted1.every((val, idx) => val === sorted2[idx]);
		};

		// Check for changes in key fields
		const checks = [
			// Basic information
			normalize(existingEvent.eventName) !== normalize(newEventData.eventName),
			normalize(existingEvent.eventDesc) !== normalize(newEventData.eventDesc),
			!isSameArray(existingEvent.eventImages, newEventData.eventImages),

			// Timestamps
			!isSameDate(existingEvent.eventStartAt, newEventData.eventStartAt),
			!isSameDate(existingEvent.eventEndAt, newEventData.eventEndAt),

			// Location
			existingEvent.locationType !== newEventData.locationType,
			normalize(existingEvent.eventCity) !== normalize(newEventData.eventCity),
			normalize(existingEvent.eventAddress) !== normalize(newEventData.eventAddress),
			existingEvent.coordinateLatitude !== newEventData.coordinateLatitude,
			existingEvent.coordinateLongitude !== newEventData.coordinateLongitude,

			// Price and capacity
			existingEvent.eventPrice !== newEventData.eventPrice,
			existingEvent.eventCurrency !== newEventData.eventCurrency,
			existingEvent.eventCapacity !== newEventData.eventCapacity,
			existingEvent.attendeeCount !== newEventData.attendeeCount,

			// Categories and tags
			!isSameArray(existingEvent.eventCategories, newEventData.eventCategories),
			!isSameArray(existingEvent.eventTags, newEventData.eventTags),

			// External info
			normalize(existingEvent.externalUrl) !== normalize(newEventData.externalUrl),
		];

		// Return true if any check indicates a change
		return checks.some((hasChange) => hasChange);
	}

	/**
	 * Schedule event jobs based on event status and timing
	 * - UPCOMING: Schedule both EVENT_START and EVENT_END
	 * - ONGOING: Schedule only EVENT_END
	 * - COMPLETED/CANCELLED/DELETED: No jobs
	 */
	private async scheduleEventJobs(event: any): Promise<void> {
		const now = new Date();
		const startTime = new Date(event.eventStartAt);
		const endTime = new Date(event.eventEndAt);

		// Handle UPCOMING events
		if (event.eventStatus === EventStatus.UPCOMING) {
			// Schedule start job if event hasn't started yet
			if (startTime > now) {
				await this.agendaService.scheduleEventStart(event._id.toString(), startTime);
			}

			// Schedule end job if event hasn't ended yet
			if (endTime > now) {
				await this.agendaService.scheduleEventEnd(event._id.toString(), endTime);
			}
			return;
		}

		// Handle ONGOING events
		if (event.eventStatus === EventStatus.ONGOING) {
			// Only schedule end job if event hasn't ended yet
			if (endTime > now) {
				await this.agendaService.scheduleEventEnd(event._id.toString(), endTime);
			}
			return;
		}

		// COMPLETED, CANCELLED, DELETED events don't need jobs
	}

	/**
	 * Handle event job scheduling when updating an imported event
	 */
	private async handleEventJobsAfterImport(oldEvent: any, updatedEvent: any): Promise<void> {
		const oldStatus = oldEvent.eventStatus;
		const newStatus = updatedEvent.eventStatus;
		const now = new Date();

		// If status or timing changed, handle accordingly
		const timeChanged =
			new Date(oldEvent.eventStartAt).getTime() !== new Date(updatedEvent.eventStartAt).getTime() ||
			new Date(oldEvent.eventEndAt).getTime() !== new Date(updatedEvent.eventEndAt).getTime();

		// Case 1: Status is DELETED, CANCELLED, or COMPLETED → Cancel all jobs
		if (
			newStatus === EventStatus.DELETED ||
			newStatus === EventStatus.CANCELLED ||
			newStatus === EventStatus.COMPLETED
		) {
			await this.agendaService.cancelEventJobs(updatedEvent._id.toString());
			return;
		}

		// Case 2: Status is ONGOING → Keep/schedule EVENT_END
		if (newStatus === EventStatus.ONGOING) {
			// Cancel all existing jobs
			await this.agendaService.cancelEventJobs(updatedEvent._id.toString());

			// Schedule EVENT_END if end time is in the future
			if (new Date(updatedEvent.eventEndAt) > now) {
				await this.agendaService.scheduleEventEnd(updatedEvent._id.toString(), updatedEvent.eventEndAt);
			}
			return;
		}

		// Case 3: Event is UPCOMING and time changed → Reschedule jobs
		if (newStatus === EventStatus.UPCOMING && timeChanged) {
			await this.agendaService.rescheduleEventJobs(
				updatedEvent._id.toString(),
				updatedEvent.eventStartAt,
				updatedEvent.eventEndAt,
			);
			return;
		}

		// Case 4: Status changed to UPCOMING from other status → Schedule new jobs
		if (newStatus === EventStatus.UPCOMING && oldStatus !== EventStatus.UPCOMING) {
			await this.scheduleEventJobs(updatedEvent);
			return;
		}
	}
}
