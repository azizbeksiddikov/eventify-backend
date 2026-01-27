import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import puppeteer, { Browser, Page } from 'puppeteer';

import { EventType, EventLocationType } from '@app/api/src/libs/enums/event.enum';
import { CrawledEvent, IEventScraper, ScraperConfig } from '@app/api/src/libs/dto/event/eventCrawling';

import { determineStatus, mergeJsonData, saveToJsonFile, deepMerge, randomDelay } from '@app/batch/src/libs/utils';
import {
	SCROLL_CONFIG,
	SCRAPER_URLS,
	SCRAPER_DEFAULTS,
	PUPPETEER_CONFIG,
	BATCH_CONFIG,
} from '@app/batch/src/libs/config';
import type { MeetupEvent, MeetupTopic } from './meetup.types';

@Injectable()
export class MeetupScraper implements IEventScraper {
	private readonly logger = new Logger(MeetupScraper.name);
	private readonly config: ScraperConfig = {
		name: 'meetup.com',
		baseUrl: SCRAPER_URLS.MEETUP.BASE,
		searchUrl: SCRAPER_URLS.MEETUP.SEARCH,
		userAgent: SCRAPER_DEFAULTS.USER_AGENT,
	};

	getName(): string {
		return this.config.name;
	}

	async scrapeEvents(limit?: number): Promise<CrawledEvent[]> {
		this.logger.log(`Crawling ${this.config.name} with Puppeteer (headless browser)`);
		if (limit) this.logger.log(`Limit set to ${limit} events`);

		try {
			// ═══════════════════════════════════════════════════════════
			// PHASE 1: Discover Events (Search Page)
			// ═══════════════════════════════════════════════════════════
			this.logger.log(`\nPHASE 1: Discovering events from search page...`);
			const htmlContent = await this.fetchPageWithPuppeteer(this.config.searchUrl, limit);
			const cheerioInstance = cheerio.load(htmlContent);
			const eventList = this.extractEventIdsAndUrls(cheerioInstance);

			// Apply limit if specified
			const eventsToFetch = limit ? eventList.slice(0, limit) : eventList;
			this.logger.log(`Found ${eventList.length} unique events, will fetch ${eventsToFetch.length}`);

			// DEBUG: Save HTML if no events found (to diagnose blocking)
			if (eventList.length === 0) {
				this.logger.warn('No events found');
				if (process.env.SAVE_JSON_FILES === 'true') {
					saveToJsonFile('jsons/meetup-debug.html', htmlContent);
					this.logger.log('Saved HTML to jsons/meetup-debug.html for inspection');
				}
			}

			// ═══════════════════════════════════════════════════════════
			// PHASE 2: Fetch Complete Data (Detail Pages) with Retry
			// Fetch detailed data with exponential backoff on failures
			// ═══════════════════════════════════════════════════════════
			this.logger.log(`\nPHASE 2: Fetching complete data for each event (with retry)...`);
			const detailedRawData = await this.fetchEventDetailsWithRetry(eventsToFetch);

			// ═══════════════════════════════════════════════════════════
			// PHASE 3: Save Raw Data
			// ═══════════════════════════════════════════════════════════
			this.logger.log(`\nPHASE 3: Saving raw data...`);
			const rawDataFile = {
				metadata: {
					source: this.config.name,
					scrapedAt: new Date().toISOString(),
					url: this.config.searchUrl,
					description: 'Complete event data from individual Meetup.com event pages',
					totalEvents: detailedRawData.length,
				},
				events: detailedRawData,
			};
			if (process.env.SAVE_JSON_FILES === 'true') {
				saveToJsonFile(`jsons/${this.config.name}-raw.json`, rawDataFile);
				this.logger.log(`Saved ${detailedRawData.length} detailed events to jsons/${this.config.name}-raw.json`);
			}

			// ═══════════════════════════════════════════════════════════
			// PHASE 4: Extract Structured Data
			// Transform raw data into CrawledEvent format
			// ═══════════════════════════════════════════════════════════
			this.logger.log(`\nPHASE 4: Extracting structured data...`);
			const extractedEvents = detailedRawData.map((rawEvent) => this.extractEventFromJsonObject(rawEvent));

			// Save CLEANED extracted events (CrawledEvent format)
			const cleanedDataFile = {
				metadata: {
					source: this.config.name,
					scrapedAt: new Date().toISOString(),
					totalEvents: extractedEvents.length,
					url: this.config.searchUrl,
					limit: limit || null,
					description: 'Cleaned and parsed events in CrawledEvent format',
				},
				events: extractedEvents,
			};
			if (process.env.SAVE_JSON_FILES === 'true') {
				saveToJsonFile(`jsons/${this.config.name}.json`, cleanedDataFile);
				this.logger.log(`Saved ${extractedEvents.length} cleaned events to jsons/${this.config.name}.json`);
			}

			return extractedEvents;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			const errorStack = error instanceof Error ? error.stack : undefined;
			this.logger.error(`Error during ${this.getName()} scraping: ${errorMessage}`, errorStack);
			if (errorStack) {
				this.logger.error(`Stack trace:\n${errorStack}`);
			}
			throw error;
		}
	}

	/**
	 * Fetch page using Puppeteer and intercept API requests
	 * This captures ALL events loaded via API calls during scrolling
	 */
	private async fetchPageWithPuppeteer(url: string, limit?: number): Promise<string> {
		let browser: Browser | undefined;
		const apiResponses: unknown[] = [];
		const allEvents: Set<string> = new Set();

		try {
			browser = await puppeteer.launch({
				headless: BATCH_CONFIG.HEADLESS,
				executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
				args: [
					'--no-sandbox',
					'--disable-setuid-sandbox',
					'--disable-dev-shm-usage',
					'--disable-gpu',
					'--disable-blink-features=AutomationControlled', // Hide automation
					'--window-size=1920,1080',
					'--disable-web-security', // Disable CORS (use with caution)
					'--disable-features=IsolateOrigins,site-per-process',
					'--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
				],
			});

			const page: Page = await browser.newPage();

			// Set realistic viewport
			await page.setViewport({
				width: 1920,
				height: 1080,
				deviceScaleFactor: 1,
			});

			// Set user agent (more realistic)
			await page.setUserAgent(
				'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
			);

			// Add extra headers to look more like a real browser
			await page.setExtraHTTPHeaders({
				'Accept-Language': 'en-US,en;q=0.9',
				Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
				'Accept-Encoding': 'gzip, deflate, br',
				Connection: 'keep-alive',
				'Upgrade-Insecure-Requests': '1',
			});

			// Override navigator.webdriver to hide automation
			await page.evaluateOnNewDocument(() => {
				Object.defineProperty(navigator, 'webdriver', {
					get: () => false,
				});

				// Override permissions
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				const originalQuery = window.navigator.permissions.query.bind(window.navigator.permissions);
				window.navigator.permissions.query = (parameters: PermissionDescriptor) => {
					if (parameters.name === 'notifications') {
						return Promise.resolve({ state: 'denied' } as PermissionStatus);
					}
					// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
					return originalQuery(parameters);
				};

				// Add chrome property
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				(window as any).chrome = {
					runtime: {},
				};

				// Mock plugins
				Object.defineProperty(navigator, 'plugins', {
					get: () => [1, 2, 3, 4, 5],
				});

				// Mock languages
				Object.defineProperty(navigator, 'languages', {
					get: () => ['en-US', 'en'],
				});
			});

			// Intercept network requests to capture API responses
			await page.setRequestInterception(true);

			page.on('request', (request) => {
				// Continue all requests
				void request.continue();
			});

			page.on('response', (response) => {
				const responseUrl = response.url();

				// Capture GraphQL API responses (Meetup uses GraphQL)
				if (responseUrl.includes('/gql') || responseUrl.includes('graphql')) {
					void (async () => {
						try {
							const responseData = (await response.json()) as unknown;
							apiResponses.push(responseData);
							this.logger.debug(`Captured API response from: ${responseUrl.substring(0, 100)}...`);

							if (limit) {
								this.countEventsInResponse(responseData, allEvents);
								if (allEvents.size >= limit) {
									this.logger.debug(`Event count: ${allEvents.size}/${limit} events found from API`);
								}
							}
						} catch {
							// Not JSON or failed to parse, skip
						}
					})();
				}
			});

			await page.goto(url, {
				waitUntil: 'domcontentloaded',
				timeout: 60000,
			});

			// Add random delay (human-like behavior)
			await randomDelay(1000, 2000);

			// Simulate human-like mouse movements
			await page.mouse.move(100, 100);
			await randomDelay(500, 1000);
			await page.mouse.move(400, 300);

			// Wait for initial events to load
			try {
				await page.waitForSelector('script[type="application/json"]', {
					timeout: PUPPETEER_CONFIG.TIMEOUT_MS / 4,
				});
				this.logger.log('Found JSON script tags on page');
			} catch {
				this.logger.warn('No JSON script tags found - page might be blocked or changed');
			}

			// Scroll until no new content loads or limit reached
			await this.scrollUntilEnd(page, allEvents, limit);

			// Final wait for any remaining API calls
			await new Promise((resolve) => setTimeout(resolve, SCROLL_CONFIG.MEETUP.WAIT_BETWEEN_ROUNDS_MS));

			// Get HTML content
			const htmlContent = await page.content();

			// DEBUG: Log API response count
			this.logger.log(`Captured ${apiResponses.length} API responses`);
			this.logger.log(`Total unique events found from API: ${allEvents.size}`);
			if (allEvents.size > 0) {
				this.logger.debug(`API event IDs: ${Array.from(allEvents).join(', ')}`);
			}

			// JSON saving disabled to reduce disk I/O - code kept for debugging purposes
			// Save API responses for debugging
			if (apiResponses.length > 0 && process.env.SAVE_JSON_FILES === 'true') {
				saveToJsonFile('jsons/meetup-api-responses-debug.json', {
					timestamp: new Date().toISOString(),
					totalResponses: apiResponses.length,
					totalEvents: allEvents.size,
					eventIds: Array.from(allEvents),
					responses: apiResponses,
				});
				this.logger.log(`Saved API responses to jsons/meetup-api-responses-debug.json`);
			}
			// Inject API responses into HTML for processing
			// Merge all API responses into single object to avoid numeric keys
			if (apiResponses.length > 0) {
				const mergedApiData = apiResponses.reduce((acc, response) => {
					return deepMerge(acc, response);
				}, {});

				const injectedHtml =
					htmlContent +
					`
					<script type="application/json" id="captured-api-data">
					${JSON.stringify(mergedApiData)}
					</script>
				`;
				return injectedHtml;
			}

			return htmlContent;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			const errorStack = error instanceof Error ? error.stack : undefined;
			this.logger.error(`Puppeteer error for ${this.config.name}: ${errorMessage}`);
			if (errorStack) {
				this.logger.error(`Stack trace:\n${errorStack}`);
			}
			throw error;
		} finally {
			if (browser) {
				await browser.close();
				this.logger.log('Browser closed');
			}
		}
	}

	/**
	 * Count unique events in API response for early stopping
	 * Uses same filtering logic as extractEventIdsAndUrls()
	 */
	private countEventsInResponse(data: unknown, eventSet: Set<string>): void {
		if (!data || typeof data !== 'object') return;

		if (Array.isArray(data)) {
			data.forEach((item) => this.countEventsInResponse(item, eventSet));
			return;
		}

		// Skip non-event types (but NOT RecommendedEventsEdge - it contains complete events!)
		const dataObj = data as Record<string, unknown>;
		if (dataObj.__typename === 'LocationSearch' || dataObj.__typename === 'ConversationConnection') {
			return;
		}

		// Only count complete events (same validation as extractEventIdsAndUrls)
		if (this.isCompleteEvent(data)) {
			const eventId = data.id;
			if (eventId) {
				eventSet.add(eventId);
			}
		}

		// Continue recursively
		Object.values(data).forEach((value) => this.countEventsInResponse(value, eventSet));
	}

	/**
	 * Scroll until end of content or limit reached
	 * Keeps scrolling as long as new content loads
	 */
	private async scrollUntilEnd(page: Page, allEvents: Set<string>, limit?: number): Promise<void> {
		const waitTimeMs = SCROLL_CONFIG.MEETUP.WAIT_BETWEEN_ROUNDS_MS;
		const NO_EVENTS_THRESHOLD = 5; // Stop after 5 consecutive scrolls with no new events
		const MIN_SCROLLS = 10; // Minimum scrolls before giving up (page needs time to load)
		let scrollAttempt = 0;
		let consecutiveNoNewContent = 0;

		while (true) {
			// Check limit BEFORE scrolling to avoid over-fetching
			if (limit && allEvents.size >= limit) {
				this.logger.log(`Limit reached: ${allEvents.size}/${limit} events (before scroll ${scrollAttempt + 1})`);
				break;
			}

			scrollAttempt++;

			// Get current page height and event count
			const beforeHeight = await page.evaluate(() => document.body.scrollHeight);
			const beforeEventCount = allEvents.size;

			this.logger.log(`Scroll ${scrollAttempt}: ${beforeEventCount} events, height: ${beforeHeight}px`);

			// Scroll to bottom (human-like smooth scrolling)
			await page.evaluate(() => {
				window.scrollTo({
					top: document.body.scrollHeight,
					behavior: 'smooth',
				});
			});

			// Add random mouse movement during scroll (human-like)
			const randomX = Math.floor(Math.random() * 800) + 100;
			const randomY = Math.floor(Math.random() * 600) + 100;
			await page.mouse.move(randomX, randomY);

			// Wait for API calls to complete and new content to render
			// Use longer wait time for first few scrolls as page needs time to initialize
			const baseWait = scrollAttempt <= 3 ? waitTimeMs * 2 : waitTimeMs;
			const randomWait = baseWait + Math.floor(Math.random() * 1000);
			await new Promise((resolve) => setTimeout(resolve, randomWait));

			// Check if new content loaded
			const afterHeight = await page.evaluate(() => document.body.scrollHeight);
			const afterEventCount = allEvents.size;
			const newEvents = afterEventCount - beforeEventCount;
			const heightIncreased = afterHeight > beforeHeight;

			if (newEvents > 0) {
				this.logger.log(`New content: +${newEvents} events, height: ${beforeHeight}px → ${afterHeight}px`);
				consecutiveNoNewContent = 0; // Reset counter when new events found
			} else if (heightIncreased) {
				this.logger.log(`Height increased but no new events: ${beforeHeight}px → ${afterHeight}px`);
				consecutiveNoNewContent++;
			} else {
				consecutiveNoNewContent++;
				this.logger.log(`No new content detected (attempt ${consecutiveNoNewContent}/${NO_EVENTS_THRESHOLD})`);

				// Only stop early if we've done minimum scrolls
				if (scrollAttempt >= MIN_SCROLLS && consecutiveNoNewContent >= NO_EVENTS_THRESHOLD) {
					this.logger.log(`Reached end of page after ${scrollAttempt} scrolls`);
					break;
				}
			}

			// Stop if no new events after threshold (but only after minimum scrolls)
			if (scrollAttempt >= MIN_SCROLLS && consecutiveNoNewContent >= NO_EVENTS_THRESHOLD) {
				this.logger.warn(`Stopping: No new content after ${NO_EVENTS_THRESHOLD} consecutive scrolls`);
				break;
			}

			// Safety limit to prevent infinite scrolling
			if (scrollAttempt >= SCROLL_CONFIG.MEETUP.MAX_SCROLLS) {
				this.logger.warn(`Reached maximum scroll limit (${SCROLL_CONFIG.MEETUP.MAX_SCROLLS})`);
				break;
			}
		}

		this.logger.log(`Scrolling complete: ${scrollAttempt} scrolls, ${allEvents.size} events from API`);
	}

	/**
	 * PHASE 1: Extract event IDs and URLs from search page
	 * Used as index for fetching detailed data from individual pages
	 */
	private extractEventIdsAndUrls(
		cheerioInstance: cheerio.CheerioAPI,
	): Array<{ id: string; url: string; title?: string }> {
		// Extract and merge all JSON script tags
		let aggregatedJsonData: any = null;
		let scriptTagCount = 0;
		cheerioInstance('script[type="application/json"]').each((_, scriptElement) => {
			try {
				const jsonText = cheerioInstance(scriptElement).html();
				if (jsonText) {
					scriptTagCount++;
					const parsedJsonData = JSON.parse(jsonText) as unknown;
					aggregatedJsonData = aggregatedJsonData ? mergeJsonData(aggregatedJsonData, parsedJsonData) : parsedJsonData;
				}
			} catch {
				// Skip invalid JSON
			}
		});

		this.logger.log(`Found ${scriptTagCount} JSON script tags`);

		if (!aggregatedJsonData) {
			this.logger.warn('No JSON data found in page - likely blocked or page structure changed');
			return [];
		}

		// Find all events (BFS)
		const eventList: Array<{ id: string; url: string; title?: string }> = [];
		const queue: unknown[] = [aggregatedJsonData];
		const visited = new Set<unknown>();
		const processedIds = new Set<string>();
		const eventTypesFound = new Set<string>();
		let objectsScanned = 0;

		while (queue.length > 0) {
			const current = queue.shift();
			if (!current || typeof current !== 'object' || visited.has(current)) continue;
			visited.add(current);
			objectsScanned++;

			// Track what types we're seeing
			const currentObj = current as Record<string, unknown>;
			if (currentObj.__typename && typeof currentObj.__typename === 'string') {
				eventTypesFound.add(currentObj.__typename);
			}

			// Skip non-event types (but NOT RecommendedEventsEdge - it contains complete events!)
			if (currentObj.__typename === 'LocationSearch' || currentObj.__typename === 'ConversationConnection') {
				continue;
			}

			// Check if this is an Event with ID and URL
			if (this.isCompleteEvent(current)) {
				const eventId = current.id;
				if (eventId && !processedIds.has(eventId)) {
					const eventUrl = current.eventUrl || `${this.config.baseUrl}/events/${eventId}`;
					processedIds.add(eventId);
					eventList.push({
						id: eventId,
						url: eventUrl,
						title: current.title,
					});
				}
			}

			// Add nested objects/arrays to queue
			if (Array.isArray(current)) {
				queue.push(...(current as unknown[]));
			} else if (typeof current === 'object' && current !== null) {
				queue.push(...(Object.values(current) as unknown[]));
			}
		}

		this.logger.log(`Scanned ${objectsScanned} objects, found types: ${Array.from(eventTypesFound).join(', ')}`);
		this.logger.log(`Extracted ${eventList.length} events`);
		if (eventList.length > 0) {
			const eventIds = eventList.map((e) => e.id).join(', ');
			this.logger.debug(`Extracted event IDs: ${eventIds}`);
		}

		return eventList;
	}

	/**
	 * PHASE 2: Fetch complete data with retry logic
	 * Designed for batch processing with delays and error handling
	 */
	async fetchEventDetailsWithRetry(
		eventList: Array<{ id: string; url: string; title?: string }>,
	): Promise<MeetupEvent[]> {
		let browser: Browser | undefined;
		const detailedRawData: MeetupEvent[] = [];
		let successCount = 0;
		let failedCount = 0;

		try {
			browser = await puppeteer.launch({
				headless: BATCH_CONFIG.HEADLESS,
				executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
				args: [
					'--no-sandbox',
					'--disable-setuid-sandbox',
					'--disable-dev-shm-usage',
					'--disable-gpu',
					'--window-size=1920,1080',
				],
			});

			let page = await browser.newPage();
			await page.setUserAgent(this.config.userAgent || SCRAPER_DEFAULTS.USER_AGENT);

			for (let i = 0; i < eventList.length; i++) {
				const eventInfo = eventList[i];
				let eventData: MeetupEvent | null = null;
				let attempts = 0;
				let needsNewPage = false;

				// Try with exponential backoff
				while (attempts <= BATCH_CONFIG.MAX_RETRIES && !eventData) {
					attempts++;

					try {
						// Create new page if previous one had detached frame error
						if (needsNewPage) {
							try {
								await page.close();
							} catch {
								// Ignore close errors
							}
							page = await browser.newPage();
							await page.setUserAgent(this.config.userAgent || SCRAPER_DEFAULTS.USER_AGENT);
							needsNewPage = false;
							this.logger.debug(`   Created new page for retry`);
						}

						if (attempts > 1) {
							const retryDelay =
								BATCH_CONFIG.BASE_DELAY_MS * Math.pow(BATCH_CONFIG.RETRY_BACKOFF_MULTIPLIER, attempts - 1);
							this.logger.log(`   Retry ${attempts}/${BATCH_CONFIG.MAX_RETRIES} after ${retryDelay}ms delay...`);
							await randomDelay(retryDelay, retryDelay * 1.5);
						}

						this.logger.log(
							`[${i + 1}/${eventList.length}] ${eventInfo.title?.substring(0, 50) || eventInfo.id}${attempts > 1 ? ` (attempt ${attempts})` : ''}`,
						);

						// Navigate to event detail page
						await page.goto(eventInfo.url, {
							waitUntil: PUPPETEER_CONFIG.WAIT_UNTIL,
							timeout: PUPPETEER_CONFIG.TIMEOUT_MS / 4,
						});

						// Wait for page to be fully loaded and stable
						await new Promise((resolve) => setTimeout(resolve, 1000));

						// Wait for event data to load
						await page.waitForSelector('script[type="application/json"]', {
							timeout: PUPPETEER_CONFIG.TIMEOUT_MS / 6,
						});

						// Additional wait for any dynamic content
						await new Promise((resolve) => setTimeout(resolve, 500));

						// Extract JSON data from page
						const htmlContent = await page.content();
						const $ = cheerio.load(htmlContent);

						let eventDetailData: unknown = null;
						$('script[type="application/json"]').each((_, scriptElement) => {
							try {
								const jsonText = $(scriptElement).html();
								if (jsonText) {
									const parsedData = JSON.parse(jsonText) as unknown;
									eventDetailData = eventDetailData ? deepMerge(eventDetailData, parsedData) : parsedData;
								}
							} catch {
								// Skip invalid JSON
							}
						});

						// Find the complete event data
						if (eventDetailData) {
							const detailedEvent = this.findEventDetailById(eventDetailData, eventInfo.id);

							if (detailedEvent) {
								// Add raw HTML to the event data
								detailedEvent.raw_html = htmlContent;

								eventData = detailedEvent;
								successCount++;
								this.logger.log(`   Success (endTime: ${detailedEvent.endTime ? 'yes' : 'no'})`);
							}
						}
					} catch (error) {
						const errorMessage = error instanceof Error ? error.message : String(error);
						this.logger.warn(`   Attempt ${attempts} failed: ${errorMessage}`);

						// If it's a detached frame error, we need a new page
						if (errorMessage.includes('detached Frame')) {
							needsNewPage = true;
						}

						if (attempts > BATCH_CONFIG.MAX_RETRIES) {
							break;
						}
					}
				}

				// Log result
				if (eventData) {
					detailedRawData.push(eventData);
				} else {
					failedCount++;
					this.logger.error(`   Failed to get data for ${eventInfo.id} after ${BATCH_CONFIG.MAX_RETRIES} retries`);
				}

				// Random delay between requests to avoid rate limiting
				if (i < eventList.length - 1) {
					await randomDelay(BATCH_CONFIG.MIN_DELAY_BETWEEN_REQUESTS_MS, BATCH_CONFIG.MAX_DELAY_BETWEEN_REQUESTS_MS);
				}
			}

			this.logger.log(`\nResults: ${successCount} success, ${failedCount} failed`);

			// Close the page
			try {
				await page.close();
			} catch {
				// Ignore close errors
			}

			return detailedRawData;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			const errorStack = error instanceof Error ? error.stack : undefined;
			this.logger.error(`Error fetching event details: ${errorMessage}`);
			if (errorStack) {
				this.logger.error(`Stack trace:\n${errorStack}`);
			}
			return detailedRawData;
		} finally {
			if (browser) {
				await browser.close();
			}
		}
	}

	/**
	 * Find event detail by ID in the page JSON data
	 */
	private findEventDetailById(jsonData: unknown, eventId: string): MeetupEvent | null {
		const queue: unknown[] = [jsonData];
		const visited = new Set<unknown>();

		while (queue.length > 0) {
			const current = queue.shift();
			if (!current || typeof current !== 'object' || visited.has(current)) continue;
			visited.add(current);

			// Check if this is the event we're looking for
			const currentObj = current as Record<string, unknown>;
			if (currentObj.__typename === 'Event' && currentObj.id === eventId) {
				return current as MeetupEvent;
			}

			// Add nested objects/arrays to queue
			if (Array.isArray(current)) {
				queue.push(...(current as unknown[]));
			} else if (typeof current === 'object' && current !== null) {
				queue.push(...(Object.values(current) as unknown[]));
			}
		}

		return null;
	}

	/**
	 * Check if object is a complete Meetup event (not a stub)
	 */
	private isCompleteEvent(obj: unknown): obj is MeetupEvent {
		if (!obj || typeof obj !== 'object') return false;
		const eventObj = obj as MeetupEvent;
		return eventObj.__typename === 'Event' && !!eventObj.title?.trim() && !!(eventObj.description || eventObj.eventUrl);
	}

	private extractEventFromJsonObject(jsonEventObject: MeetupEvent): CrawledEvent {
		const startDateTime = new Date(jsonEventObject.dateTime || '');
		const endDateTime = new Date(jsonEventObject.endTime || '');

		const eventStatus = determineStatus(startDateTime, endDateTime);
		const tags = this.extractTags(jsonEventObject);

		const locationData = this.extractLocation(jsonEventObject);

		const maxTickets = jsonEventObject.maxTickets;
		let eventCapacity: number | undefined = maxTickets !== undefined ? Number(maxTickets) : undefined;
		if (eventCapacity === undefined || eventCapacity === 0 || isNaN(eventCapacity)) {
			eventCapacity = undefined;
		}

		const priceInfo = this.extractPrice(jsonEventObject);

		return {
			// ===== Event Type =====
			eventType: EventType.ONCE,

			// ===== Basic Information =====
			eventName: jsonEventObject.title || 'Untitled Event',
			eventDesc: jsonEventObject.description || 'No description available',
			// Extract images: try featuredEventPhoto, then groupPhoto, then HTML extraction
			eventImages: this.extractEventImages(jsonEventObject),
			eventPrice: priceInfo.amount,
			eventCurrency: priceInfo.currency,

			// ===== Event Timestamps =====
			eventStartAt: startDateTime,
			eventEndAt: endDateTime,

			// ===== Location Details =====
			locationType: locationData.type,
			eventCity: locationData.city,
			eventAddress: locationData.address,
			coordinateLatitude: locationData.latitude,
			coordinateLongitude: locationData.longitude,

			// ===== Type and Status =====
			eventStatus: eventStatus,
			eventCategories: [],
			eventTags: tags,
			isRealEvent: true,

			// ===== External Source Information =====
			origin: this.config.name,
			externalId: jsonEventObject.id,
			externalUrl: jsonEventObject.eventUrl,

			// ===== References =====
			groupId: undefined,

			// ===== Event Attendees =====
			attendeeCount: jsonEventObject.goingCount?.totalCount || 0,
			eventCapacity: eventCapacity,

			// ===== Data Storage =====
			rawData: jsonEventObject,
		};
	}

	/**
	 * Extract event images from multiple sources:
	 * 1. featuredEventPhoto (event-specific photo)
	 * 2. group.groupPhoto (group photo as fallback)
	 * 3. HTML content (extract from event page HTML)
	 */
	private extractEventImages(jsonEventObject: MeetupEvent): string[] {
		const images: string[] = [];

		// 1. Try featuredEventPhoto first (event-specific photo)
		const featuredEventPhoto = jsonEventObject?.featuredEventPhoto;
		if (featuredEventPhoto) {
			const featuredPhoto = typeof featuredEventPhoto === 'string' ? featuredEventPhoto : featuredEventPhoto.source;
			if (featuredPhoto) {
				images.push(featuredPhoto);
				return images;
			}
		}

		// 2. Fallback to groupPhoto
		const groupPhotoObj = jsonEventObject?.group?.groupPhoto;
		if (groupPhotoObj) {
			const groupPhoto = typeof groupPhotoObj === 'string' ? groupPhotoObj : groupPhotoObj.source;
			if (groupPhoto) {
				images.push(groupPhoto);
				return images;
			}
		}

		// 3. Extract from HTML content if available
		const htmlContent = jsonEventObject?.raw_html;
		if (htmlContent && typeof htmlContent === 'string') {
			const htmlImages = this.extractImagesFromHtml(htmlContent);
			if (htmlImages.length > 0) {
				return htmlImages;
			}
		}

		return [];
	}

	/**
	 * Extract event images from HTML content
	 * Looks for event images in various HTML elements
	 */
	private extractImagesFromHtml(htmlContent: string): string[] {
		const images: string[] = [];
		const $ = cheerio.load(htmlContent);

		// Try multiple selectors for event images
		const selectors = [
			// Main event image/hero image
			'img[data-testid="event-hero-image"]',
			'img.event-hero-image',
			'.event-hero img',
			'[class*="event-hero"] img',
			'[class*="EventHero"] img',
			// Event photo sections
			'[class*="event-photo"] img',
			'[class*="EventPhoto"] img',
			// Main content images (prioritize larger images)
			'article img[src*="meetupstatic.com"]',
			'[role="main"] img[src*="meetupstatic.com"]',
			'.event-details img[src*="meetupstatic.com"]',
			// Any meetupstatic.com images (event photos)
			'img[src*="meetupstatic.com/photos/event"]',
		];

		for (const selector of selectors) {
			$(selector).each((_, element) => {
				const src = $(element).attr('src');
				const srcset = $(element).attr('srcset');
				const dataSrc = $(element).attr('data-src');

				// Prefer high-res images
				const imageUrl = srcset
					? srcset.split(',').pop()?.trim().split(' ')[0] // Get highest res from srcset
					: dataSrc || src;

				if (imageUrl && imageUrl.startsWith('http') && !images.includes(imageUrl)) {
					// Filter out small icons, avatars, and non-event images
					if (
						!imageUrl.includes('/classic-member/') &&
						!imageUrl.includes('/favicon') &&
						!imageUrl.includes('/icon') &&
						(imageUrl.includes('/photos/event/') || imageUrl.includes('/highres_'))
					) {
						images.push(imageUrl);
					}
				}
			});

			// If we found images with this selector, return them
			if (images.length > 0) {
				break;
			}
		}

		// Limit to first 3 images to avoid too many
		return images.slice(0, 3);
	}

	/**
	 * Extract tags from Meetup's group topics
	 * Only extracts topic names from group.topics array
	 */
	private extractTags(eventObject: MeetupEvent): string[] {
		const tags: string[] = [];

		// Extract from group's topics array
		const topics = eventObject.group?.topics || eventObject.topics || [];
		topics.forEach((topic: MeetupTopic | string) => {
			const topicName = typeof topic === 'string' ? topic : topic.name;
			if (topicName) tags.push(topicName);
		});

		return tags;
	}

	/**
	 * Extract price information from Meetup event
	 */
	private extractPrice(eventObject: MeetupEvent): { amount: number | undefined; currency?: string } {
		const feeSettings = eventObject?.feeSettings;
		if (!feeSettings) return { amount: 0, currency: undefined };

		const amount = feeSettings?.amount;
		const currency = feeSettings?.currency;
		// special case (<1 KRW)

		if (amount !== undefined && amount !== null) {
			const amountNum = typeof amount === 'number' ? amount : parseFloat(String(amount));
			if (amountNum < 1000 && currency === 'KRW') return { amount: 0, currency: undefined };
			return { amount: amountNum, currency };
		}

		// default to free
		return { amount: 0, currency: undefined };
	}

	private extractLocation(eventObject: MeetupEvent): {
		type: EventLocationType;
		city?: string;
		address?: string;
		latitude?: number;
		longitude?: number;
	} {
		const isOnlineEvent =
			eventObject.eventType === 'ONLINE' ||
			eventObject.eventType === 'VIRTUAL' ||
			eventObject.isOnline === true ||
			eventObject.eventType === 'PHYSICAL'
				? false
				: true;

		const venueAddress = eventObject.venue?.address || eventObject.venue?.name;

		const latitude = eventObject.venue?.lat;
		const longitude = eventObject.venue?.lng;

		return {
			type: isOnlineEvent ? EventLocationType.ONLINE : EventLocationType.OFFLINE,
			city: isOnlineEvent ? undefined : eventObject.venue?.city,
			address: venueAddress,
			latitude: latitude !== undefined ? parseFloat(String(latitude)) : undefined,
			longitude: longitude !== undefined ? parseFloat(String(longitude)) : undefined,
		};
	}
}
