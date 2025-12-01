import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { Event } from '@app/api/src/libs/dto/event/event';
import { MeetupScraper } from './scrapers/meetup.scraper';
import { LumaScraper } from './scrapers/luma.scraper';
import { IEventScraper, CrawledEvent } from '@app/api/src/libs/dto/event/eventCrawling';
import { LLMService } from '../llm/llm.service';
import { EventLocationType, EventStatus } from '@app/api/src/libs/enums/event.enum';

/**
 * Web Crawling Service - Coordinates multiple event scrapers
 *
 * Responsibilities:
 * 1. Manages scraper implementations (Meetup, Luma, etc.)
 * 2. Aggregates and deduplicates scraped events
 * 3. Applies AI filtering and categorization
 * 4. Saves results to JSON files
 * 5. Imports accepted events to MongoDB
 *
 * @remarks
 * Scrapers run in parallel for better performance
 * Events are deduplicated before database import
 */
@Injectable()
export class WebCrawlingService {
	private readonly logger = new Logger(WebCrawlingService.name);
	private readonly scrapers: IEventScraper[] = [];

	constructor(
		@InjectModel('Event') private readonly eventModel: Model<Event>,
		private readonly meetupScraper: MeetupScraper,
		private readonly lumaScraper: LumaScraper,
		private readonly llmService: LLMService,
	) {
		// Initialize all available scrapers
		this.scrapers = [this.meetupScraper, this.lumaScraper];

		this.logger.log(
			`Initialized ${this.scrapers.length} scraper(s): ${this.scrapers.map((s) => s.getName()).join(', ')}`,
		);
	}

	/**
	 * Main entry point: Crawl, filter, and import events
	 *
	 * Process flow:
	 * 1. Run all scrapers in parallel
	 * 2. Filter events with AI (if enabled)
	 * 3. Categorize accepted events with AI
	 * 4. Save results to JSON files
	 * 5. Import to MongoDB (with deduplication)
	 *
	 * @param limit Optional limit for testing (e.g., 10 events per source)
	 * @returns Array of accepted events after AI filtering
	 */
	async getEventCrawling(limit?: number): Promise<CrawledEvent[]> {
		const allEvents: CrawledEvent[] = [];
		const scraperResults: { [key: string]: { count: number; events: CrawledEvent[] } } = {};

		try {
			// Step 1: Run all scrapers in parallel for better performance
			this.logger.log('🔄 Starting web scraping from all sources...');
			const results = await Promise.allSettled(
				this.scrapers.map(async (scraper) => {
					try {
						this.logger.log(`Starting scraper: ${scraper.getName()}`);
						const events = await scraper.scrapeEvents();
						this.logger.log(`Scraper ${scraper.getName()} completed: ${events.length} events`);
						return { scraper: scraper.getName(), events };
					} catch (error) {
						this.logger.error(`Scraper ${scraper.getName()} failed: ${error.message}`, error.stack);
						throw error;
					}
				}),
			);

			// Aggregate results from all scrapers (skip failed ones)
			results.forEach((result, index) => {
				if (result.status === 'fulfilled') {
					const { scraper, events } = result.value;
					scraperResults[scraper] = { count: events.length, events };
					allEvents.push(...events);
				} else {
					const scraperName = this.scrapers[index].getName();
					this.logger.warn(`Scraper ${scraperName} failed, continuing with others`);
				}
			});

			this.logger.log(`📊 Total scraped: ${allEvents.length} events`);

			// Step 2: Filter events with LLM (if enabled)
			const { accepted, rejected, reasons } = await this.llmService.filterEvents(allEvents);

			// Step 3: Categorize accepted events with LLM (if enabled)
			const categoriesMap = await this.llmService.categorizeEvents(accepted);

			// Apply categories to events
			accepted.forEach((event) => {
				const categories = categoriesMap.get(event.eventUrl || event.eventName);
				if (categories && categories.length > 0) {
					event.eventCategories = categories;
				}
			});

			// Step 4: Save all data (scraped + filtered) to JSON
			await this.saveAllEventsToJson(allEvents, accepted, rejected, reasons, scraperResults);

			// Step 5: Import accepted events to database
			const imported = await this.importEventsToDatabase(accepted);

			this.logger.log(`✅ Final: ${accepted.length} events ready, ${imported} imported to DB`);
			return accepted;
		} catch (error) {
			this.logger.error(`Error during web crawling: ${error.message}`, error.stack);
			throw error;
		}
	}

	/**
	 * Save all events (scraped + filtered) to jsons/all_events.json
	 */
	private async saveAllEventsToJson(
		rawEvents: CrawledEvent[],
		acceptedEvents: CrawledEvent[],
		rejectedEvents: CrawledEvent[],
		rejectionReasons: Map<string, string>,
		scraperResults: { [key: string]: { count: number; events: CrawledEvent[] } },
	): Promise<void> {
		try {
			const jsonsDir = path.join(process.cwd(), 'jsons');
			if (!fs.existsSync(jsonsDir)) {
				fs.mkdirSync(jsonsDir, { recursive: true });
			}

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
						model: process.env.OLLAMA_MODEL || 'qwen2.5:0.5b',
					},
				},
				acceptedEvents: acceptedEvents,
				rejectedEvents: rejectedEvents.map((event) => ({
					eventName: event.eventName,
					eventUrl: event.eventUrl,
					source: event.rawData?.metadata?.source,
					reason: rejectionReasons.get(event.eventUrl || event.eventName) || 'Unknown',
				})),
			};

			const filePath = path.join(jsonsDir, 'all_events.json');
			fs.writeFileSync(filePath, JSON.stringify(dataToSave, null, 2), 'utf-8');

			this.logger.log(`💾 Saved to jsons/all_events.json:`);
			this.logger.log(`   ✅ ${acceptedEvents.length} accepted events`);
			if (llmEnabled && rejectedEvents.length > 0) {
				this.logger.log(`   ❌ ${rejectedEvents.length} rejected events`);
			}
		} catch (error) {
			this.logger.warn(`Failed to save JSON file: ${error.message}`);
		}
	}

	/**
	 * Import AI-filtered events to MongoDB
	 *
	 * Features:
	 * - Auto-deduplication by externalId and externalUrl
	 * - Maps CrawledEvent format to Event schema
	 * - Preserves raw data for reference
	 * - Marks events as external (isRealEvent: false)
	 *
	 * @param events Array of accepted events from AI filtering
	 * @returns Number of events successfully imported
	 */
	private async importEventsToDatabase(events: CrawledEvent[]): Promise<number> {
		this.logger.log(`💾 Importing ${events.length} AI-filtered events to database...`);

		let imported = 0;
		let skipped = 0;

		for (const event of events) {
			try {
				// Check if event already exists by external ID or URL
				const existingEvent = await this.eventModel.findOne({
					$or: [{ externalId: event.rawData?.id }, { externalUrl: event.eventUrl }],
				});

				if (existingEvent) {
					skipped++;
					continue;
				}

				// Map CrawledEvent to Event schema
				const newEvent = {
					eventType: 'ONCE', // Default to one-time event
					eventName: event.eventName,
					eventDesc: event.eventDesc,
					eventImages: event.eventImages || [],
					eventStartAt: new Date(event.eventStartAt),
					eventEndAt: new Date(event.eventEndAt),
					eventTimezone: event.rawData?.timezone || 'Asia/Seoul',
					locationType: event.locationType || EventLocationType.ONLINE,
					eventCity: event.location?.eventCity,
					eventAddress: event.rawData?.locationDetails?.address,
					eventCoordinates: event.rawData?.locationDetails?.coordinates,
					eventCapacity: event.rawData?.maxTickets || event.rawData?.eventCapacity,
					eventPrice: 0, // Most crawled events are free
					eventStatus: EventStatus.UPCOMING,
					eventCategories: event.eventCategories || ['OTHER'],
					eventTags: event.eventTags || [],
					origin: event.rawData?.metadata?.source || 'external',
					externalId: event.rawData?.id || event.eventUrl,
					externalUrl: event.eventUrl,
					attendeeCount: event.attendeeCount || 0,
					eventLikes: 0,
					eventViews: 0,
					rawData: event.rawData, // Keep raw data for reference
					isRealEvent: false, // External events
				};

				await this.eventModel.create(newEvent);
				imported++;
				this.logger.debug(`   ✅ Imported: ${event.eventName}`);
			} catch (error) {
				this.logger.warn(`   ❌ Failed to import "${event.eventName}": ${error.message}`);
			}
		}

		this.logger.log(`✅ Database import complete: ${imported} imported, ${skipped} skipped (duplicates)`);
		return imported;
	}

	/**
	 * Crawl events from a specific scraper by name
	 * @param scraperName Name of the scraper to use
	 * @param limit Optional limit for testing (e.g., 5-10 events)
	 * @returns Array of crawled events from the specified scraper
	 */
	async getEventCrawlingBySource(scraperName: string, limit?: number): Promise<CrawledEvent[]> {
		const scraper = this.scrapers.find((s) => s.getName().toLowerCase() === scraperName.toLowerCase());

		if (!scraper) {
			throw new Error(
				`Scraper "${scraperName}" not found. Available scrapers: ${this.scrapers.map((s) => s.getName()).join(', ')}`,
			);
		}

		this.logger.log(`Starting scraper: ${scraper.getName()}`);
		const events = await scraper.scrapeEvents();

		// Apply limit if specified (for testing)
		const limitedEvents = limit ? events.slice(0, limit) : events;

		this.logger.log(
			`Scraper ${scraper.getName()} completed: ${limitedEvents.length} events${limit ? ` (limited to ${limit} for testing)` : ''}`,
		);

		return limitedEvents;
	}
}
