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
import { EventLocationType, EventStatus, EventType } from '@app/api/src/libs/enums/event.enum';
import { EventInput } from '@app/api/src/libs/dto/event/event.input';

@Injectable()
export class WebCrawlingService {
	private readonly scrapers: IEventScraper[] = [];

	constructor(
		@InjectModel('Event') private readonly eventModel: Model<Event>,
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
			for (const scraper of this.scrapers) {
				try {
					const events = await scraper.scrapeEvents(limit);

					scraperResults[scraper.getName()] = { count: events.length, events: events };
					allEvents.push(...events);
				} catch (error) {
					console.error(`Scraper ${scraper.getName()} failed: ${error.message}`, error.stack);
					console.warn(`Continuing with other scrapers...`);
				}
			}

			////////////////////////////////////////////////////////////
			// Step 2: Filter events with LLM + Fill missing data
			////////////////////////////////////////////////////////////
			const { accepted, rejected, reasons } = await this.llmService.filterAndCompleteEvents(allEvents);

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
			// let imported = 0;
			// if (!testMode) {
			// 	imported = await this.importEventsToDatabase(accepted);

			// 	await this.saveStepToJson('step3_import_results', {
			// 		metadata: {
			// 			step: 3,
			// 			description: 'Database import results',
			// 			importedAt: new Date().toISOString(),
			// 			totalImported: imported,
			// 			totalSkipped: accepted.length - imported,
			// 		},
			// 		summary: {
			// 			imported,
			// 			skipped: accepted.length - imported,
			// 			total: accepted.length,
			// 		},
			// 	});
			// }

			return accepted;
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
		let imported = 0;
		let skipped = 0;

		for (const event of events) {
			try {
				// Check if event already exists by external ID or URL
				const existingEvent = await this.eventModel.findOne({
					$or: [{ externalId: event.externalId }, { externalUrl: event.externalUrl }],
				});

				if (existingEvent) {
					skipped++;
					continue;
				}

				// Map CrawledEvent to Event schema
				const newEventInput: EventInput = {
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
					locationType: event.locationType || EventLocationType.ONLINE,
					eventCity: event.eventCity,
					eventAddress: event.eventAddress,
					// Coordinates
					coordinateLatitude: event.coordinateLatitude,
					coordinateLongitude: event.coordinateLongitude,

					// ===== Type and Status =====
					eventStatus: EventStatus.UPCOMING,
					eventCategories: event.eventCategories || ['OTHER'],
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

				await this.eventModel.create(newEventInput);
				imported++;
			} catch (error) {
				console.warn(`Failed to import "${event.eventName}": ${error.message}`);
			}
		}

		console.log(`Database import complete: ${imported} imported, ${skipped} skipped (duplicates)`);
		return imported;
	}
}
