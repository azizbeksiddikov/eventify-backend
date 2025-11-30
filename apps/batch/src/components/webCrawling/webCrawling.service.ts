import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { Event } from '@app/api/src/libs/dto/event/event';
import { MeetupScraper } from './scrapers/meetup.scraper';
import { LumaScraper } from './scrapers/luma.scraper';
import { IEventScraper, CrawledEvent } from '@app/api/src/libs/dto/event/eventCrawling';

/**
 * WebCrawlingService acts as a coordinator for multiple event scrapers.
 * It manages different scraper implementations and aggregates their results.
 */
@Injectable()
export class WebCrawlingService {
	private readonly logger = new Logger(WebCrawlingService.name);
	private readonly scrapers: IEventScraper[] = [];

	constructor(
		@InjectModel('Event') private readonly eventModel: Model<Event>,
		private readonly meetupScraper: MeetupScraper,
		private readonly lumaScraper: LumaScraper,
	) {
		// Initialize all available scrapers
		this.scrapers = [this.meetupScraper, this.lumaScraper];

		this.logger.log(
			`Initialized ${this.scrapers.length} scraper(s): ${this.scrapers.map((s) => s.getName()).join(', ')}`,
		);
	}

	/**
	 * Crawl events from all configured scrapers and save to all_events.json
	 * @returns Array of all crawled events from all sources
	 */
	async getEventCrawling(): Promise<CrawledEvent[]> {
		const allEvents: CrawledEvent[] = [];
		const scraperResults: { [key: string]: { count: number; events: CrawledEvent[] } } = {};

		try {
			// Run all scrapers in parallel for better performance
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

			// Aggregate results from successful scrapers
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

			this.logger.log(`Total events crawled from all sources: ${allEvents.length}`);

			// Save combined results to all_events.json
			await this.saveAllEventsToJson(allEvents, scraperResults);

			return allEvents;
		} catch (error) {
			this.logger.error(`Error during web crawling: ${error.message}`, error.stack);
			throw error;
		}
	}

	/**
	 * Save all events from all scrapers to jsons/all_events.json
	 */
	private async saveAllEventsToJson(
		allEvents: CrawledEvent[],
		scraperResults: { [key: string]: { count: number; events: CrawledEvent[] } },
	): Promise<void> {
		try {
			const jsonsDir = path.join(process.cwd(), 'jsons');
			if (!fs.existsSync(jsonsDir)) {
				fs.mkdirSync(jsonsDir, { recursive: true });
			}

			// Prepare combined data with metadata
			const dataToSave = {
				metadata: {
					scrapedAt: new Date().toISOString(),
					totalEvents: allEvents.length,
					sources: Object.keys(scraperResults).map((source) => ({
						name: source,
						eventCount: scraperResults[source].count,
					})),
					scrapers: this.scrapers.map((s) => s.getName()),
				},
				eventsBySource: scraperResults,
				allEvents: allEvents,
			};

			const filePath = path.join(jsonsDir, 'all_events.json');
			fs.writeFileSync(filePath, JSON.stringify(dataToSave, null, 2), 'utf-8');

			this.logger.log(`💾 Saved ${allEvents.length} combined events to jsons/all_events.json`);
		} catch (error) {
			this.logger.warn(`Failed to save combined JSON file: ${error.message}`);
		}
	}

	/**
	 * Crawl events from a specific scraper by name
	 * @param scraperName Name of the scraper to use
	 * @returns Array of crawled events from the specified scraper
	 */
	async getEventCrawlingBySource(scraperName: string): Promise<CrawledEvent[]> {
		const scraper = this.scrapers.find((s) => s.getName().toLowerCase() === scraperName.toLowerCase());

		if (!scraper) {
			throw new Error(
				`Scraper "${scraperName}" not found. Available scrapers: ${this.scrapers.map((s) => s.getName()).join(', ')}`,
			);
		}

		this.logger.log(`Starting scraper: ${scraper.getName()}`);
		const events = await scraper.scrapeEvents();
		this.logger.log(`Scraper ${scraper.getName()} completed: ${events.length} events`);

		return events;
	}
}
