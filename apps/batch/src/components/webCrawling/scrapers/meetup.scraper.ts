import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';

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
import { Currency } from '@app/api/src/libs/enums/common.enum';

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
			this.logger.log(`\n📋 PHASE 1: Discovering events from search page...`);
			const htmlContent = await this.fetchPageWithPuppeteer(this.config.searchUrl, limit);
			const cheerioInstance = cheerio.load(htmlContent);
			const eventList = this.extractEventIdsAndUrls(cheerioInstance);

			// Apply limit if specified
			const eventsToFetch = limit ? eventList.slice(0, limit) : eventList;
			this.logger.log(`✅ Found ${eventList.length} unique events, will fetch ${eventsToFetch.length}`);

			// DEBUG: Save HTML if no events found (to diagnose blocking)
			if (eventList.length === 0) {
				this.logger.warn('⚠️ No events found - saving HTML for inspection');
				await saveToJsonFile('jsons/meetup-debug.html', htmlContent);
			}

			// ═══════════════════════════════════════════════════════════
			// PHASE 2: Fetch Complete Data (Detail Pages) with Retry
			// Fetch detailed data with exponential backoff on failures
			// ═══════════════════════════════════════════════════════════
			this.logger.log(`\n📄 PHASE 2: Fetching complete data for each event (with retry)...`);
			const detailedRawData = await this.fetchEventDetailsWithRetry(eventsToFetch);

			// ═══════════════════════════════════════════════════════════
			// PHASE 3: Save Raw Data
			// ═══════════════════════════════════════════════════════════
			this.logger.log(`\n💾 PHASE 3: Saving raw data...`);
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
			await saveToJsonFile(`jsons/${this.config.name}-raw.json`, rawDataFile);
			this.logger.log(`✅ Saved ${detailedRawData.length} detailed events to raw JSON`);

			// ═══════════════════════════════════════════════════════════
			// PHASE 4: Extract Structured Data
			// Transform raw data into CrawledEvent format
			// ═══════════════════════════════════════════════════════════
			this.logger.log(`\n🔄 PHASE 4: Extracting structured data...`);
			const extractedEvents = detailedRawData.map((rawEvent) => this.extractEventFromJsonObject(rawEvent));

			// 🧹 Save CLEANED extracted events (CrawledEvent format)
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
			await saveToJsonFile(`jsons/${this.config.name}.json`, cleanedDataFile);
			this.logger.log(`✅ Saved ${extractedEvents.length} cleaned events to JSON`);

			return extractedEvents;
		} catch (error) {
			this.logger.error(`Error during ${this.getName()} scraping: ${error.message}`, error.stack);
			throw error;
		}
	}

	/**
	 * Fetch page using Puppeteer and intercept API requests
	 * This captures ALL events loaded via API calls during scrolling
	 */
	private async fetchPageWithPuppeteer(url: string, limit?: number): Promise<string> {
		let browser;
		const apiResponses: any[] = [];
		const allEvents: Set<string> = new Set();
		let shouldStopScrolling = false;

		try {
			browser = await puppeteer.launch({
				headless: BATCH_CONFIG.HEADLESS,
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

			const page = await browser.newPage();

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
				const originalQuery = window.navigator.permissions.query;
				window.navigator.permissions.query = (parameters: any) =>
					parameters.name === 'notifications'
						? Promise.resolve({ state: 'denied' } as PermissionStatus)
						: originalQuery(parameters);

				// Add chrome property
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
				request.continue();
			});

			page.on('response', async (response) => {
				const responseUrl = response.url();

				// Capture GraphQL API responses (Meetup uses GraphQL)
				if (responseUrl.includes('/gql') || responseUrl.includes('graphql')) {
					try {
						const responseData = await response.json();
						apiResponses.push(responseData);
						this.logger.debug(`🌐 Captured API response from: ${responseUrl.substring(0, 100)}...`);

						// Early stop: Count unique events from API responses
						if (limit) {
							this.countEventsInResponse(responseData, allEvents);
							if (allEvents.size >= limit) {
								shouldStopScrolling = true;
								this.logger.log(`Reached limit: ${allEvents.size}/${limit} events found, stopping scroll`);
							}
						}
					} catch (error) {
						// Not JSON or failed to parse, skip
					}
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
				this.logger.log('✅ Found JSON script tags on page');
			} catch (error) {
				this.logger.warn('⚠️ No JSON script tags found - page might be blocked or changed');
			}

			// Scroll until no new content loads or limit reached
			await this.scrollUntilEnd(page, allEvents, limit);

			// Final wait for any remaining API calls
			await new Promise((resolve) => setTimeout(resolve, SCROLL_CONFIG.MEETUP.WAIT_BETWEEN_ROUNDS_MS));

			// Get HTML content
			const htmlContent = await page.content();

			// DEBUG: Log API response count
			this.logger.log(`📡 Captured ${apiResponses.length} API responses`);
			this.logger.log(`📊 Total unique events found from API: ${allEvents.size}`);

			// Save API responses for debugging
			if (apiResponses.length > 0) {
				await saveToJsonFile('jsons/meetup-api-responses-debug.json', {
					timestamp: new Date().toISOString(),
					totalResponses: apiResponses.length,
					totalEvents: allEvents.size,
					responses: apiResponses,
				});
				this.logger.log(`💾 Saved API responses to jsons/meetup-api-responses-debug.json`);
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
	 * Count unique events in API response for early stopping
	 * Uses same filtering logic as extractEventIdsAndUrls()
	 */
	private countEventsInResponse(data: any, eventSet: Set<string>): void {
		if (!data || typeof data !== 'object') return;

		if (Array.isArray(data)) {
			data.forEach((item) => this.countEventsInResponse(item, eventSet));
			return;
		}

		// Skip non-event types (but NOT RecommendedEventsEdge - it contains complete events!)
		if (data.__typename === 'LocationSearch' || data.__typename === 'ConversationConnection') {
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
	private async scrollUntilEnd(page: any, allEvents: Set<string>, limit?: number): Promise<void> {
		const waitTimeMs = SCROLL_CONFIG.MEETUP.WAIT_BETWEEN_ROUNDS_MS;
		const NO_EVENTS_THRESHOLD = 5; // Stop after 5 consecutive scrolls with no new events
		let scrollAttempt = 0;
		let consecutiveNoEvents = 0;

		while (true) {
			scrollAttempt++;

			// Get current page height and event count
			const beforeHeight = await page.evaluate(() => document.body.scrollHeight);
			const beforeEventCount = allEvents.size;

			this.logger.log(`📜 Scroll ${scrollAttempt}: ${beforeEventCount} events, height: ${beforeHeight}px`);

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

			// Wait for API calls to complete and new content to render (with some randomness)
			const randomWait = waitTimeMs + Math.floor(Math.random() * 1000);
			await new Promise((resolve) => setTimeout(resolve, randomWait));

			// Check if new content loaded
			const afterHeight = await page.evaluate(() => document.body.scrollHeight);
			const afterEventCount = allEvents.size;
			const newEvents = afterEventCount - beforeEventCount;
			const heightIncreased = afterHeight > beforeHeight;

			if (newEvents > 0) {
				this.logger.log(`✅ New content: +${newEvents} events, height: ${beforeHeight}px → ${afterHeight}px`);
				consecutiveNoEvents = 0; // Reset counter when new events found
			} else if (heightIncreased) {
				this.logger.log(`⚠️ Height increased but no new events: ${beforeHeight}px → ${afterHeight}px`);
				consecutiveNoEvents++;
			} else {
				this.logger.log(`⛔ No new content detected, reached end of page`);
				break;
			}

			// Stop if no new events after threshold
			if (consecutiveNoEvents >= NO_EVENTS_THRESHOLD) {
				this.logger.warn(`🛑 Stopping: No new events found after ${NO_EVENTS_THRESHOLD} consecutive scrolls`);
				break;
			}

			// Early stop if limit reached
			if (limit && allEvents.size >= limit) {
				this.logger.log(`🎯 Limit reached: ${allEvents.size}/${limit} events`);
				break;
			}
		}
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
					const parsedJsonData = JSON.parse(jsonText);
					aggregatedJsonData = aggregatedJsonData ? mergeJsonData(aggregatedJsonData, parsedJsonData) : parsedJsonData;
				}
			} catch (error) {
				// Skip invalid JSON
			}
		});

		this.logger.log(`🔍 Found ${scriptTagCount} JSON script tags`);

		if (!aggregatedJsonData) {
			this.logger.warn('⚠️ No JSON data found in page - likely blocked or page structure changed');
			return [];
		}

		// Find all events (BFS)
		const eventList: Array<{ id: string; url: string; title?: string }> = [];
		const queue: any[] = [aggregatedJsonData];
		const visited = new Set<any>();
		const processedIds = new Set<string>();
		let eventTypesFound = new Set<string>();
		let objectsScanned = 0;

		while (queue.length > 0) {
			const current = queue.shift();
			if (!current || typeof current !== 'object' || visited.has(current)) continue;
			visited.add(current);
			objectsScanned++;

			// Track what types we're seeing
			if (current.__typename) {
				eventTypesFound.add(current.__typename);
			}

			// Skip non-event types (but NOT RecommendedEventsEdge - it contains complete events!)
			if (current.__typename === 'LocationSearch' || current.__typename === 'ConversationConnection') {
				continue;
			}

			// Check if this is an Event with ID and URL
			if (this.isCompleteEvent(current)) {
				const eventId = current.id;
				const eventUrl = current.eventUrl || `${this.config.baseUrl}/events/${eventId}`;

				if (eventId && !processedIds.has(eventId)) {
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
				queue.push(...current);
			} else if (typeof current === 'object') {
				queue.push(...Object.values(current));
			}
		}

		this.logger.log(`🔍 Scanned ${objectsScanned} objects, found types: ${Array.from(eventTypesFound).join(', ')}`);
		this.logger.log(`📊 Extracted ${eventList.length} events`);

		return eventList;
	}

	/**
	 * PHASE 2: Fetch complete data with retry logic
	 * Designed for batch processing with delays and error handling
	 */
	async fetchEventDetailsWithRetry(eventList: Array<{ id: string; url: string; title?: string }>): Promise<any[]> {
		let browser;
		const detailedRawData: any[] = [];
		let successCount = 0;
		let failedCount = 0;

		try {
			browser = await puppeteer.launch({
				headless: BATCH_CONFIG.HEADLESS,
				args: [
					'--no-sandbox',
					'--disable-setuid-sandbox',
					'--disable-dev-shm-usage',
					'--disable-gpu',
					'--window-size=1920,1080',
				],
			});

			let page = await browser.newPage();
			await page.setUserAgent(this.config.userAgent);

			for (let i = 0; i < eventList.length; i++) {
				const eventInfo = eventList[i];
				let eventData: any = null;
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
							} catch (e) {
								// Ignore close errors
							}
							page = await browser.newPage();
							await page.setUserAgent(this.config.userAgent);
							needsNewPage = false;
							this.logger.debug(`   🔄 Created new page for retry`);
						}

						if (attempts > 1) {
							const retryDelay =
								BATCH_CONFIG.BASE_DELAY_MS * Math.pow(BATCH_CONFIG.RETRY_BACKOFF_MULTIPLIER, attempts - 1);
							this.logger.log(`   🔄 Retry ${attempts}/${BATCH_CONFIG.MAX_RETRIES} after ${retryDelay}ms delay...`);
							await randomDelay(retryDelay, retryDelay * 1.5);
						}

						this.logger.log(
							`📄 [${i + 1}/${eventList.length}] ${eventInfo.title?.substring(0, 50) || eventInfo.id}${attempts > 1 ? ` (attempt ${attempts})` : ''}`,
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

						let eventDetailData: any = null;
						$('script[type="application/json"]').each((_, scriptElement) => {
							try {
								const jsonText = $(scriptElement).html();
								if (jsonText) {
									const parsedData = JSON.parse(jsonText);
									eventDetailData = eventDetailData ? deepMerge(eventDetailData, parsedData) : parsedData;
								}
							} catch (error) {
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
								this.logger.log(`   ✅ Success (endTime: ${detailedEvent.endTime ? '✓' : '✗'})`);
							}
						}
					} catch (error) {
						this.logger.warn(`   ⚠️ Attempt ${attempts} failed: ${error.message}`);

						// If it's a detached frame error, we need a new page
						if (error.message.includes('detached Frame')) {
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
					this.logger.error(`   ❌ Failed to get data for ${eventInfo.id} after ${BATCH_CONFIG.MAX_RETRIES} retries`);
				}

				// Random delay between requests to avoid rate limiting
				if (i < eventList.length - 1) {
					await randomDelay(BATCH_CONFIG.MIN_DELAY_BETWEEN_REQUESTS_MS, BATCH_CONFIG.MAX_DELAY_BETWEEN_REQUESTS_MS);
				}
			}

			this.logger.log(`\n📊 Results: ✅ ${successCount} success, ❌ ${failedCount} failed`);

			// Close the page
			try {
				await page.close();
			} catch (e) {
				// Ignore close errors
			}

			return detailedRawData;
		} catch (error) {
			this.logger.error(`❌ Error fetching event details: ${error.message}`);
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
	private findEventDetailById(jsonData: any, eventId: string): any {
		const queue: any[] = [jsonData];
		const visited = new Set<any>();

		while (queue.length > 0) {
			const current = queue.shift();
			if (!current || typeof current !== 'object' || visited.has(current)) continue;
			visited.add(current);

			// Check if this is the event we're looking for
			if (current.__typename === 'Event' && current.id === eventId) {
				return current;
			}

			// Add nested objects/arrays to queue
			if (Array.isArray(current)) {
				queue.push(...current);
			} else if (typeof current === 'object') {
				queue.push(...Object.values(current));
			}
		}

		return null;
	}

	/**
	 * Check if object is a complete Meetup event (not a stub)
	 */
	private isCompleteEvent(obj: any): boolean {
		return obj?.__typename === 'Event' && obj.title?.trim() && (obj.description || obj.eventUrl);
	}

	private extractEventFromJsonObject(jsonEventObject: any): CrawledEvent {
		const startDateTime = new Date(jsonEventObject.dateTime || '');
		const endDateTime = new Date(jsonEventObject.endTime || '');

		const eventStatus = determineStatus(startDateTime, endDateTime);
		const tags = this.extractTags(jsonEventObject);

		const locationData = this.extractLocation(jsonEventObject);

		let eventCapacity: number | undefined = Number(jsonEventObject.maxTickets);
		if (eventCapacity == 0) eventCapacity = undefined;

		const priceInfo = this.extractPrice(jsonEventObject);

		return {
			// ===== Event Type =====
			eventType: EventType.ONCE,

			// ===== Basic Information =====
			eventName: jsonEventObject.title || 'Untitled Event',
			eventDesc: jsonEventObject.description || 'No description available',
			eventImages: [jsonEventObject?.featuredEventPhoto?.source],
			eventPrice: priceInfo.amount,
			eventCurrency: priceInfo.currency as Currency,

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
	 * Extract tags from Meetup's group topics
	 * Only extracts topic names from group.topics array
	 */
	private extractTags(eventObject: any): string[] {
		const tags: string[] = [];

		// Extract from group's topics array
		const topics = eventObject.group?.topics || eventObject.topics || [];
		topics.forEach((topic: any) => {
			const topicName = topic?.name;
			if (topicName) tags.push(topicName);
		});

		return tags;
	}

	/**
	 * Extract price information from Meetup event
	 */
	private extractPrice(eventObject: any): { amount: number | undefined; currency?: string } {
		const feeSettings = eventObject?.feeSettings;
		if (!feeSettings) return { amount: 0, currency: undefined };

		const amount = feeSettings?.amount;
		const currency = feeSettings?.currency;
		// special case (<1 KRW)

		if (amount !== undefined && amount !== null) {
			if (amount < 1000 && currency === 'KRW') return { amount: 0, currency: undefined };
			return { amount: parseFloat(amount), currency };
		}

		// default to free
		return { amount: 0, currency: undefined };
	}

	private extractLocation(eventObject: any): {
		type: EventLocationType;
		city?: string;
		address?: string;
		latitude?: number;
		longitude?: number;
	} {
		const isOnlineEvent =
			eventObject.eventType === 'ONLINE' ||
			eventObject.eventType === 'VIRTUAL' ||
			eventObject.isOnline ||
			(eventObject.eventType === 'PHYSICAL') === false;

		const venueAddress = eventObject.venue?.address || eventObject.venue?.name;

		const latitude = eventObject.venue?.lat;
		const longitude = eventObject.venue?.lng;

		return {
			type: isOnlineEvent ? EventLocationType.ONLINE : EventLocationType.OFFLINE,
			city: isOnlineEvent ? undefined : eventObject.venue?.city,
			address: venueAddress,
			latitude: latitude ? parseFloat(latitude) : undefined,
			longitude: longitude ? parseFloat(longitude) : undefined,
		};
	}
}
