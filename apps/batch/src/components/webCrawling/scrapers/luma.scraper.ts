import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

import { EventType } from '@app/api/src/libs/enums/event.enum';
import { CrawledEvent, IEventScraper, ScraperConfig, EventLocation } from '@app/api/src/libs/dto/event/eventCrawling';
import { determineStatus } from '@app/batch/src/libs/utils';

/**
 * LUMA Scraper - Scrapes events from lu.ma for Seoul
 */
@Injectable()
export class LumaScraper implements IEventScraper {
	private readonly logger = new Logger(LumaScraper.name);
	private readonly config: ScraperConfig = {
		name: 'luma',
		baseUrl: 'https://luma.com',
		searchUrl: 'https://luma.com/seoul',
		userAgent:
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
	};

	constructor(private readonly httpService: HttpService) {}

	getName(): string {
		return 'luma.com';
	}

	async scrapeEvents(): Promise<CrawledEvent[]> {
		try {
			this.logger.log(`Crawling ${this.getName()} with Puppeteer (headless browser)`);

			let extractedEvents: CrawledEvent[] = [];

			// Try Puppeteer for complete results
			try {
				const htmlContent = await this.fetchPageWithPuppeteer(this.config.searchUrl);
				const cheerioInstance = cheerio.load(htmlContent);
				extractedEvents = await this.extractEventsFromPage(cheerioInstance);

				this.logger.log(`✅ Puppeteer: Crawled ${extractedEvents.length} events from ${this.getName()}`);
			} catch (puppeteerError) {
				this.logger.warn(`Puppeteer failed: ${puppeteerError.message}`);
				this.logger.log('Falling back to HTTP-only scraping');

				// Fallback to simple HTTP request
				const cheerioInstance = await this.fetchPage(this.config.searchUrl);
				extractedEvents = await this.extractEventsFromPage(cheerioInstance);

				this.logger.log(`✅ HTTP fallback: Crawled ${extractedEvents.length} events from ${this.getName()}`);
			}

			// Save to JSON file
			await this.saveToJsonFile(extractedEvents);

			return extractedEvents;
		} catch (error) {
			this.logger.error(`Error during ${this.getName()} scraping: ${error.message}`, error.stack);
			throw error;
		}
	}

	/**
	 * Fetch page using Puppeteer and intercept API requests
	 */
	private async fetchPageWithPuppeteer(url: string): Promise<string> {
		this.logger.log('🚀 Launching headless browser with API interception...');

		let browser;
		const apiResponses: any[] = [];

		try {
			browser = await puppeteer.launch({
				headless: true,
				args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
			});

			const page = await browser.newPage();

			// Set user agent
			await page.setUserAgent(this.config.userAgent);

			// 🔥 INTERCEPT NETWORK REQUESTS - Capture API responses
			await page.setRequestInterception(true);

			page.on('request', (request) => {
				request.continue();
			});

			page.on('response', async (response) => {
				const responseUrl = response.url();

				// Capture API responses from lu.ma
				if (responseUrl.includes('lu.ma/api') || responseUrl.includes('/_next/data')) {
					try {
						const responseData = await response.json();
						apiResponses.push(responseData);
						this.logger.debug(`📡 Captured API response from: ${responseUrl}`);
					} catch (error) {
						// Not JSON or failed to parse, skip
					}
				}
			});

			this.logger.log(`📄 Navigating to ${url}...`);
			await page.goto(url, {
				waitUntil: 'domcontentloaded',
				timeout: 60000,
			});

			// Wait for events to load
			this.logger.log('⏳ Waiting for events to load...');
			await new Promise((resolve) => setTimeout(resolve, 3000));

			// Scroll to trigger lazy loading
			this.logger.log('📜 Scrolling to trigger lazy loading (5 rounds)...');
			for (let i = 0; i < 5; i++) {
				await this.autoScroll(page);
				this.logger.log(`   ✓ Scroll ${i + 1}/5`);
				await new Promise((resolve) => setTimeout(resolve, 1500));
			}

			// Final wait
			this.logger.log('⏳ Waiting for final API responses...');
			await new Promise((resolve) => setTimeout(resolve, 3000));

			// Get HTML content
			const htmlContent = await page.content();

			// Log captured data
			this.logger.log(`✅ Captured ${apiResponses.length} API responses`);

			// Inject API responses into HTML for processing
			if (apiResponses.length > 0) {
				const injectedHtml =
					htmlContent +
					`
					<script type="application/json" id="captured-api-data">
					${JSON.stringify(apiResponses)}
					</script>
				`;
				return injectedHtml;
			}

			return htmlContent;
		} catch (error) {
			this.logger.error(`❌ Puppeteer error: ${error.message}`);
			throw error;
		} finally {
			if (browser) {
				await browser.close();
				this.logger.log('🔒 Browser closed');
			}
		}
	}

	/**
	 * Auto-scroll the page to trigger lazy loading
	 */
	private async autoScroll(page: any): Promise<void> {
		await page.evaluate(async () => {
			await new Promise<void>((resolve) => {
				let totalHeight = 0;
				const distance = 500;
				const maxScrolls = 100;
				let scrollCount = 0;

				const timer = setInterval(() => {
					const scrollHeight = document.body.scrollHeight;
					window.scrollBy(0, distance);
					totalHeight += distance;
					scrollCount++;

					if (totalHeight >= scrollHeight || scrollCount >= maxScrolls) {
						clearInterval(timer);
						window.scrollTo(0, document.body.scrollHeight);
						resolve();
					}
				}, 100);
			});
		});
	}

	private async fetchPage(url: string): Promise<cheerio.CheerioAPI> {
		const response = await firstValueFrom(
			this.httpService.get(url, {
				headers: {
					'User-Agent': this.config.userAgent,
					Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
					'Accept-Language': 'en-US,en;q=0.5',
				},
			}),
		);

		return cheerio.load(response.data);
	}

	private async extractEventsFromPage(cheerioInstance: cheerio.CheerioAPI): Promise<CrawledEvent[]> {
		const extractedEvents: CrawledEvent[] = [];
		const processedEventIds = new Set<string>();

		// Try JSON extraction
		const eventsFromJson = this.extractFromJson(cheerioInstance, processedEventIds);
		if (eventsFromJson.length > 0) {
			extractedEvents.push(...eventsFromJson);
		}

		// Try HTML extraction as fallback
		const eventsFromHtml = this.extractFromHtml(cheerioInstance, processedEventIds);
		if (eventsFromHtml.length > 0) {
			extractedEvents.push(...eventsFromHtml);
		}

		this.logger.log(`🎯 Extracted ${extractedEvents.length} unique events`);

		// Enrich events with descriptions from detail pages
		this.logger.log(`📖 Fetching descriptions from ${extractedEvents.length} event detail pages...`);
		await this.enrichEventsWithDescriptions(extractedEvents);

		return extractedEvents;
	}

	private extractFromJson(cheerioInstance: cheerio.CheerioAPI, processedEventIds: Set<string>): CrawledEvent[] {
		const events: CrawledEvent[] = [];

		cheerioInstance('script[type="application/json"]').each((_, scriptElement) => {
			try {
				const jsonText = cheerioInstance(scriptElement).html();
				if (jsonText) {
					const parsedData = JSON.parse(jsonText);
					this.searchForEvents(parsedData, events, processedEventIds);
				}
			} catch (error) {
				// Not valid JSON, skip
			}
		});

		return events;
	}

	private searchForEvents(obj: any, events: CrawledEvent[], processedEventIds: Set<string>): void {
		if (!obj || typeof obj !== 'object') return;

		if (Array.isArray(obj)) {
			obj.forEach((item) => this.searchForEvents(item, events, processedEventIds));
			return;
		}

		// Check if this looks like a LUMA event
		const isLumaEvent =
			(obj.name || obj.title) && (obj.url || obj.event_url || obj.api_id) && (obj.start_at || obj.startAt || obj.start);

		if (isLumaEvent) {
			const eventId = obj.api_id || obj.id || obj.event_url || obj.url || `${obj.name}-${obj.start_at}`;

			if (eventId && processedEventIds.has(eventId)) {
				return; // Skip duplicate
			}

			if (eventId) {
				processedEventIds.add(eventId);
			}

			try {
				const event = this.mapToEventFormat(obj);
				if (event) {
					events.push(event);
				}
			} catch (error) {
				this.logger.warn(`Error extracting event: ${error.message}`);
			}
		}

		// Continue searching nested objects
		Object.keys(obj).forEach((key) => {
			this.searchForEvents(obj[key], events, processedEventIds);
		});
	}

	private extractFromHtml(cheerioInstance: cheerio.CheerioAPI, processedEventIds: Set<string>): CrawledEvent[] {
		const events: CrawledEvent[] = [];

		// LUMA typically uses event cards with specific class patterns
		const eventSelectors = ['[class*="event-card"]', '[class*="EventCard"]', 'a[href*="/event/"]', 'article'];

		eventSelectors.forEach((selector) => {
			cheerioInstance(selector).each((_, element) => {
				try {
					const $element = cheerioInstance(element);
					const eventUrl = $element.attr('href') || $element.find('a').first().attr('href');

					if (!eventUrl || !eventUrl.includes('event')) return;

					const eventId = eventUrl;
					if (processedEventIds.has(eventId)) return;

					const eventName = $element.find('h2, h3, [class*="title"]').first().text().trim();
					if (!eventName || eventName.length < 3) return;

					processedEventIds.add(eventId);

					const dateText = $element.find('[class*="date"], time').first().text().trim();
					const locationText = $element.find('[class*="location"]').first().text().trim();
					const imageUrl = $element.find('img').first().attr('src');

					const startDate = dateText ? new Date(dateText) : new Date();
					const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

					events.push({
						eventType: EventType.ONCE,
						eventName: eventName.substring(0, 100),
						eventDesc: 'Event from lu.ma',
						eventImages: imageUrl ? [imageUrl] : [],
						eventStartAt: startDate,
						eventEndAt: endDate,
						eventPrice: 0,
						isRealEvent: true,
						eventStatus: determineStatus(startDate, endDate),
						eventCategories: [],
						attendeeCount: 0,
						eventCapacity: undefined,
						eventUrl: eventUrl.startsWith('http') ? eventUrl : `${this.config.baseUrl}${eventUrl}`,
						location: {
							type: locationText?.toLowerCase().includes('online') ? 'online' : 'offline',
							eventCity: 'Seoul',
							address: locationText,
						},
						rawData: {
							html: $element.html(),
						},
					});
				} catch (error) {
					this.logger.warn(`Error extracting from HTML: ${error.message}`);
				}
			});
		});

		return events;
	}

	private mapToEventFormat(lumaEvent: any): CrawledEvent | null {
		try {
			const eventName = lumaEvent.name || lumaEvent.title;
			if (!eventName) return null;

			const startDate = new Date(lumaEvent.start_at || lumaEvent.startAt || lumaEvent.start);
			const endDate = new Date(
				lumaEvent.end_at || lumaEvent.endAt || lumaEvent.end || startDate.getTime() + 2 * 60 * 60 * 1000,
			);

			// FIX: Use location_type directly from Luma's API
			const isOnline = lumaEvent.location_type === 'online' || lumaEvent.event_type === 'online';

			// Better location handling from geo_address_info
			const geoInfo = lumaEvent.geo_address_info || lumaEvent.geo_address_json;
			const city = geoInfo?.city || geoInfo?.city_state || geoInfo?.region || 'Seoul';
			const address = geoInfo?.full_address || geoInfo?.description || geoInfo?.address || lumaEvent.location_name;

			// FIX: Build full event URL
			const eventSlug = lumaEvent.url || lumaEvent.event_url || lumaEvent.api_id;
			const fullEventUrl = eventSlug?.startsWith('http') ? eventSlug : `${this.config.baseUrl}/${eventSlug}`;

			// Enrich raw data with comprehensive information for LLM filtering
			const enrichedRawData = {
				// Original data
				...lumaEvent,

				// Event details
				eventDetails: {
					api_id: lumaEvent.api_id,
					name: eventName,
					description: lumaEvent.description || lumaEvent.summary,
					eventType: lumaEvent.event_type,
					visibility: lumaEvent.visibility,
					timezone: lumaEvent.timezone,
					requiresApproval: lumaEvent.requires_approval || false,
					waitlistEnabled: lumaEvent.waitlist_enabled || false,
					hideRsvp: lumaEvent.hide_rsvp || false,
					showGuestList: lumaEvent.show_guest_list || false,
				},

				// Host/Calendar information
				hosts: {
					calendar: lumaEvent.calendar || null,
					user: lumaEvent.user || null,
					coHosts: lumaEvent.co_hosts || [],
				},

				// Attendance
				attendance: {
					guestCount: lumaEvent.guest_count || 0,
					guestLimit: lumaEvent.guest_limit,
					approvalRequired: lumaEvent.requires_approval,
					waitlistCount: lumaEvent.waitlist_count || 0,
				},

				// Location details
				locationDetails: {
					type: lumaEvent.location_type,
					isOnline: isOnline,
					geoAddressInfo: geoInfo,
					virtualInfo: lumaEvent.virtual_info,
					coordinate: lumaEvent.coordinate,
				},

				// Timing
				timing: {
					startAt: startDate.toISOString(),
					endAt: endDate.toISOString(),
					timezone: lumaEvent.timezone,
					duration: lumaEvent.duration,
				},

				// Media
				media: {
					coverUrl: lumaEvent.cover_url,
					photos: lumaEvent.photos || [],
				},

				// Metadata for LLM
				metadata: {
					source: 'luma.com',
					scrapedAt: new Date().toISOString(),
					hasDescription: !!(lumaEvent.description || lumaEvent.summary),
					hasImage: !!lumaEvent.cover_url,
					hasLocation: !!geoInfo,
					url: fullEventUrl,
				},
			};

			return {
				eventType: EventType.ONCE,
				eventName: eventName.substring(0, 100),
				eventDesc: lumaEvent.description || lumaEvent.summary || 'Event from luma.com', // Will be enriched later
				eventImages: lumaEvent.cover_url ? [lumaEvent.cover_url] : [],
				eventStartAt: startDate,
				eventEndAt: endDate,
				isRealEvent: true,
				eventPrice: 0, // Will be enriched later
				eventStatus: determineStatus(startDate, endDate),
				eventCategories: [],
				attendeeCount: lumaEvent.guest_count || 0, // Will be enriched later
				eventCapacity: lumaEvent.guest_limit || undefined,
				eventUrl: fullEventUrl,
				location: {
					type: isOnline ? 'online' : 'offline',
					eventCity: city,
					address: address,
				},
				rawData: enrichedRawData,
			};
		} catch (error) {
			this.logger.warn(`Error mapping LUMA event: ${error.message}`);
			return null;
		}
	}

	/**
	 * Enrich events with comprehensive data from their detail pages for LLM filtering
	 * Fetches: description, attendee count, pricing, host info, and ALL available metadata
	 */
	private async enrichEventsWithDescriptions(events: CrawledEvent[]): Promise<void> {
		let successCount = 0;
		let failCount = 0;

		for (let i = 0; i < events.length; i++) {
			const event = events[i];
			try {
				// Skip if no URL
				if (!event.eventUrl) {
					failCount++;
					continue;
				}

				this.logger.debug(`   📄 Enriching event ${i + 1}/${events.length}: ${event.eventName}`);

				// Visit the event detail page
				const eventPage = await this.fetchPage(event.eventUrl);

				let enrichedData = {
					description: '',
					attendeeCount: event.attendeeCount,
					price: event.eventPrice,
					capacity: event.eventCapacity,
					fullEventData: null as any, // Store complete event object from page
					hosts: [] as any[],
					tags: [] as string[],
					requiresApproval: false,
					ticketInfo: null as any,
				};

				// 1. Extract ALL JSON data from the page (comprehensive)
				eventPage('script[type="application/json"]').each((_, scriptElement) => {
					try {
						const jsonText = eventPage(scriptElement).html();
						if (jsonText) {
							const jsonData = JSON.parse(jsonText);

							// Search for complete event data in the JSON
							this.enrichFromJson(jsonData, enrichedData);
						}
					} catch (error) {
						// Not valid JSON, skip
					}
				});

				// 2. Try JSON-LD schema
				eventPage('script[type="application/ld+json"]').each((_, scriptElement) => {
					try {
						const jsonText = eventPage(scriptElement).html();
						if (jsonText) {
							const jsonData = JSON.parse(jsonText);
							if (jsonData.description && !enrichedData.description) {
								enrichedData.description = jsonData.description;
							}
						}
					} catch (error) {
						// Not valid JSON, skip
					}
				});

				// 3. Try meta description
				if (!enrichedData.description) {
					enrichedData.description = eventPage('meta[property="og:description"]').attr('content') || '';
				}
				if (!enrichedData.description) {
					enrichedData.description = eventPage('meta[name="description"]').attr('content') || '';
				}

				// 4. Try common description selectors
				if (!enrichedData.description) {
					const descSelectors = [
						'[class*="description"]',
						'[class*="Description"]',
						'[class*="about"]',
						'[class*="About"]',
						'[data-testid*="description"]',
					];

					for (const selector of descSelectors) {
						const text = eventPage(selector).first().text().trim();
						if (text && text.length > 50) {
							enrichedData.description = text;
							break;
						}
					}
				}

				// Update event with enriched data
				let updated = false;
				if (enrichedData.description && enrichedData.description.length > 10) {
					event.eventDesc = enrichedData.description.substring(0, 1000);
					updated = true;
				}
				if (enrichedData.attendeeCount > 0) {
					event.attendeeCount = enrichedData.attendeeCount;
					updated = true;
				}
				if (enrichedData.price > 0) {
					event.eventPrice = enrichedData.price;
					updated = true;
				}
				if (enrichedData.capacity) {
					event.eventCapacity = enrichedData.capacity;
					updated = true;
				}

				// Enrich rawData with comprehensive information for LLM
				if (enrichedData.fullEventData || enrichedData.hosts.length > 0) {
					event.rawData = {
						...(event.rawData || {}),
						// Full event data from detail page
						detailPageData: enrichedData.fullEventData,
						// Host/Organizer information
						hosts: enrichedData.hosts,
						// Tags/Topics
						tags: enrichedData.tags,
						// Ticket/RSVP information
						ticketInfo: enrichedData.ticketInfo,
						requiresApproval: enrichedData.requiresApproval,
						// Metadata for LLM
						enrichedMetadata: {
							source: 'luma.com',
							enrichedAt: new Date().toISOString(),
							hasDescription: !!enrichedData.description,
							hasHosts: enrichedData.hosts.length > 0,
							hasTags: enrichedData.tags.length > 0,
							isPaid: enrichedData.price > 0,
						},
					};
					updated = true;
				}

				if (updated) {
					successCount++;
				} else {
					failCount++;
				}

				// Small delay to avoid overwhelming the server
				await new Promise((resolve) => setTimeout(resolve, 200));
			} catch (error) {
				this.logger.warn(`   ⚠️ Failed to enrich ${event.eventName}: ${error.message}`);
				failCount++;
			}
		}

		this.logger.log(`✅ Enriched ${successCount} events with comprehensive data (${failCount} failed)`);
	}

	/**
	 * Search JSON data recursively for ALL event details (comprehensive for LLM)
	 */
	private enrichFromJson(obj: any, enrichedData: any): void {
		if (!obj || typeof obj !== 'object') return;

		// Check if this is a complete event object
		if (obj.api_id && obj.name && obj.start_at) {
			enrichedData.fullEventData = obj;
			if (obj.description) enrichedData.description = obj.description;
			if (obj.guest_count) enrichedData.attendeeCount = obj.guest_count;
			if (obj.guest_limit) enrichedData.capacity = obj.guest_limit;
			if (obj.price) enrichedData.price = obj.price;
			if (obj.requires_approval !== undefined) enrichedData.requiresApproval = obj.requires_approval;
		}

		// Extract host/organizer information
		if (obj.hosts || obj.event_hosts || obj.calendar) {
			const hosts = obj.hosts || obj.event_hosts || [];
			if (Array.isArray(hosts)) {
				enrichedData.hosts = hosts;
			}
			if (obj.calendar) {
				enrichedData.hosts.push({
					type: 'calendar',
					name: obj.calendar.name,
					api_id: obj.calendar.api_id,
				});
			}
		}

		// Extract tags/topics
		if (obj.tags || obj.topics || obj.categories) {
			const tags = obj.tags || obj.topics || obj.categories || [];
			if (Array.isArray(tags)) {
				enrichedData.tags = [...enrichedData.tags, ...tags];
			}
		}

		// Extract ticket information
		if (obj.ticket_types || obj.tickets || obj.pricing) {
			enrichedData.ticketInfo = obj.ticket_types || obj.tickets || obj.pricing;
		}

		// Standard field extraction
		if (obj.description && !enrichedData.description) {
			enrichedData.description = obj.description;
		}
		if (obj.guest_count && obj.guest_count > enrichedData.attendeeCount) {
			enrichedData.attendeeCount = obj.guest_count;
		}
		if (obj.guest_limit && !enrichedData.capacity) {
			enrichedData.capacity = obj.guest_limit;
		}
		if (obj.price && obj.price > 0) {
			enrichedData.price = obj.price;
		}

		// Recursively search nested objects
		if (Array.isArray(obj)) {
			obj.forEach((item) => this.enrichFromJson(item, enrichedData));
		} else {
			Object.keys(obj).forEach((key) => {
				this.enrichFromJson(obj[key], enrichedData);
			});
		}
	}

	/**
	 * Save scraped events to jsons/luma.json
	 */
	private async saveToJsonFile(events: CrawledEvent[]): Promise<void> {
		try {
			const jsonsDir = path.join(process.cwd(), 'jsons');
			if (!fs.existsSync(jsonsDir)) {
				fs.mkdirSync(jsonsDir, { recursive: true });
			}

			const dataToSave = {
				metadata: {
					source: this.getName(),
					scrapedAt: new Date().toISOString(),
					totalEvents: events.length,
					url: this.config.searchUrl,
				},
				events: events,
			};

			const filePath = path.join(jsonsDir, 'luma.json');
			fs.writeFileSync(filePath, JSON.stringify(dataToSave, null, 2), 'utf-8');

			this.logger.log(`💾 Saved ${events.length} events to jsons/luma.json`);
		} catch (error) {
			this.logger.warn(`Failed to save to JSON file: ${error.message}`);
		}
	}
}
