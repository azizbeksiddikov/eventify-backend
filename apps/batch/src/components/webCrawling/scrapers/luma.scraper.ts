import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import puppeteer, { type Browser, type Page } from 'puppeteer';

import { EventType, EventLocationType } from '@app/api/src/libs/enums/event.enum';
import { CrawledEvent, IEventScraper, ScraperConfig } from '@app/api/src/libs/dto/event/eventCrawling';
import { determineStatus, saveToJsonFile, deepMerge, randomDelay } from '@app/batch/src/libs/utils';
import { SCRAPER_URLS, SCRAPER_DEFAULTS, PUPPETEER_CONFIG, BATCH_CONFIG } from '@app/batch/src/libs/config';
import type { LumaEvent, LumaJsonData, LumaTicketType, LumaPageProps } from './luma.types';

/**
 * LUMA Scraper - Scrapes events from luma.com
 */
@Injectable()
export class LumaScraper implements IEventScraper {
	private readonly logger = new Logger(LumaScraper.name);
	private readonly config: ScraperConfig = {
		name: 'luma.com',
		baseUrl: SCRAPER_URLS.LUMA?.BASE || 'https://luma.com',
		searchUrl: SCRAPER_URLS.LUMA?.SEARCH || 'https://luma.com/seoul',
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
			const htmlContent = await this.fetchPageWithPuppeteer(this.config.searchUrl);
			const cheerioInstance = cheerio.load(htmlContent);
			const eventList = this.extractEventIdsAndUrls(cheerioInstance);

			// Apply limit if specified
			const eventsToFetch = limit ? eventList.slice(0, limit) : eventList;
			this.logger.log(`Found ${eventList.length} unique events, will fetch ${eventsToFetch.length}`);

			if (eventList.length === 0) this.logger.warn('No events found');

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
					description: 'Complete event data from individual Luma event pages',
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
			const extractedEvents = detailedRawData
				.map((rawEvent) => this.mapToEventFormat(rawEvent))
				.filter((e) => e !== null);

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
			throw error;
		}
	}

	/**
	 * Fetch page using Puppeteer
	 * Extracts event data from JSON script tags embedded in the page
	 */
	private async fetchPageWithPuppeteer(url: string): Promise<string> {
		let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;

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
				(window as Window & { chrome?: { runtime: Record<string, unknown> } }).chrome = {
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

			// Wait for JSON script tags to load
			try {
				await page.waitForSelector('script[type="application/json"]', {
					timeout: PUPPETEER_CONFIG.TIMEOUT_MS / 2,
				});
				this.logger.log('Page loaded with JSON data');
			} catch {
				this.logger.warn('No JSON script tags found - page might be blocked or changed');
			}

			// Wait for page to be fully rendered
			await new Promise((resolve) => setTimeout(resolve, 2000));

			// Get HTML content
			const htmlContent = await page.content();

			return htmlContent;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			this.logger.error(`Puppeteer error: ${errorMessage}`);
			throw error;
		} finally {
			if (browser) {
				await browser.close();
				this.logger.log('Browser closed');
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
		const eventList: Array<{ id: string; url: string; title?: string }> = [];
		const processedIds = new Set<string>();

		// Extract and merge all JSON script tags
		let aggregatedJsonData: LumaJsonData | null = null;
		let scriptTagCount = 0;
		const allScriptContents: LumaJsonData[] = [];

		cheerioInstance('script[type="application/json"]').each((_, scriptElement) => {
			try {
				const jsonText = cheerioInstance(scriptElement).html();
				if (jsonText) {
					scriptTagCount++;
					const parsedJsonData = JSON.parse(jsonText) as LumaJsonData;
					allScriptContents.push(parsedJsonData);
					aggregatedJsonData = aggregatedJsonData
						? (deepMerge(aggregatedJsonData, parsedJsonData) as LumaJsonData)
						: parsedJsonData;
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

		// SPECIAL HANDLING: Check if this is a discovery page with events array
		const pageProps = aggregatedJsonData as LumaPageProps;
		const pageData = pageProps?.props?.pageProps?.initialData?.data;
		if (pageData && 'place' in pageData && 'events' in pageData) {
			const eventCount = pageData.place?.event_count || 0;
			const eventsArray = pageData.events || [];
			const featuredEvents = pageData.featured_events || [];

			if (eventCount === 0 && eventsArray.length === 0 && featuredEvents.length === 0) {
				this.logger.warn(`This page has no events - try a different location`);
			}

			// If we have events in the data.events or featured_events arrays, extract them directly
			const allPageEvents: LumaEvent[] = [...eventsArray, ...featuredEvents];
			if (allPageEvents.length > 0) {
				const directEvents: Array<{ id: string; url: string; title?: string }> = [];
				allPageEvents.forEach((event: LumaEvent) => {
					if (event?.api_id && event?.name) {
						const eventUrl = event.url?.startsWith('http') ? event.url : `${this.config.baseUrl}/event/${event.api_id}`;

						directEvents.push({
							id: event.api_id,
							url: eventUrl,
							title: event.name,
						});
					}
				});

				if (directEvents.length > 0) {
					this.logger.log(`Found ${directEvents.length} events in page data`);
					return directEvents;
				}
			}
		}

		// Find all events (BFS) - fallback if no direct events found
		const queue: unknown[] = [aggregatedJsonData];
		const visited = new Set<unknown>();

		while (queue.length > 0) {
			const current = queue.shift();
			if (!current || typeof current !== 'object' || visited.has(current)) continue;
			visited.add(current);

			// Check if this is a complete Luma event with ID and URL
			const eventObj = current as LumaEvent;
			if (this.isCompleteEvent(eventObj)) {
				const eventId = eventObj.api_id || eventObj.event_id || eventObj.id;

				// Build event URL
				let eventUrl: string;
				if (eventObj.url?.startsWith('http')) {
					eventUrl = eventObj.url;
				} else if (eventObj.url) {
					eventUrl = `${this.config.baseUrl}/${eventObj.url}`;
				} else if (eventObj.api_id) {
					// Luma event URLs are typically luma.com/event/{api_id}
					eventUrl = `${this.config.baseUrl}/event/${eventObj.api_id}`;
				} else if (eventId) {
					eventUrl = `${this.config.baseUrl}/${eventId}`;
				} else {
					continue;
				}

				if (eventId && !processedIds.has(eventId)) {
					processedIds.add(eventId);
					eventList.push({
						id: eventId,
						url: eventUrl,
						title: eventObj.name || eventObj.title,
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

		this.logger.log(`Extracted ${eventList.length} complete events from JSON`);

		return eventList;
	}

	/**
	 * PHASE 2: Fetch complete data with retry logic
	 * Designed for batch processing with delays and error handling
	 */
	async fetchEventDetailsWithRetry(
		eventList: Array<{ id: string; url: string; title?: string }>,
	): Promise<LumaEvent[]> {
		let browser: Browser | undefined;
		const detailedRawData: LumaEvent[] = [];
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

			let page: Page = await browser.newPage();
			await page.setUserAgent(this.config.userAgent || SCRAPER_DEFAULTS.USER_AGENT);

			for (let i = 0; i < eventList.length; i++) {
				const eventInfo = eventList[i];
				let eventData: LumaEvent | null = null;
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

						let eventDetailData: LumaJsonData | null = null;
						const eventScripts: LumaJsonData[] = [];

						$('script[type="application/json"]').each((_, scriptElement) => {
							try {
								const jsonText = $(scriptElement).html();
								if (jsonText) {
									const parsedData = JSON.parse(jsonText) as LumaJsonData;
									eventScripts.push(parsedData);
									eventDetailData = eventDetailData
										? (deepMerge(eventDetailData, parsedData) as LumaJsonData)
										: parsedData;
								}
							} catch {
								// Skip invalid JSON
							}
						});

						// Find the complete event data
						if (eventDetailData) {
							const detailedEvent = this.findEventDetailById(eventDetailData, eventInfo.id);

							if (detailedEvent) {
								// Try to extract description from HTML if not in JSON
								if (!detailedEvent.description) {
									const htmlDescription = this.extractDescriptionFromHTML($);
									if (htmlDescription) detailedEvent.description = htmlDescription;
								}

								// Try to extract price from HTML if not in JSON
								const hasJSONPrice = detailedEvent.ticket_types || detailedEvent.tickets || detailedEvent.price;
								if (!hasJSONPrice) {
									const priceFromHTML = this.extractPriceFromHTML($);
									if (priceFromHTML) {
										detailedEvent.ticket_types = priceFromHTML;
										this.logger.debug(`   Added ticket prices from HTML: ${priceFromHTML.length} ticket type(s)`);
									} else {
										this.logger.debug(`   No price info found in JSON or HTML (might be free event)`);
									}
								}

								// Add raw HTML to the event data
								detailedEvent.raw_html = htmlContent;

								eventData = detailedEvent;
								successCount++;
								this.logger.log(`   Success (description: ${detailedEvent.description ? 'yes' : 'no'})`);
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
			this.logger.error(`Error fetching event details: ${errorMessage}`);
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
	private findEventDetailById(jsonData: LumaJsonData, eventId: string): LumaEvent | null {
		const queue: unknown[] = [jsonData];
		const visited = new Set<unknown>();

		while (queue.length > 0) {
			const current = queue.shift();
			if (!current || typeof current !== 'object' || visited.has(current)) continue;
			visited.add(current);

			// Check if this is the event we're looking for
			const eventObj = current as LumaEvent;
			const currentId = eventObj.api_id || eventObj.event_id || eventObj.id;
			const matchesId =
				currentId === eventId ||
				(eventObj.url?.includes(eventId) ?? false) ||
				(typeof currentId === 'string' && typeof eventId === 'string' && currentId.includes(eventId));

			if (this.isCompleteEvent(eventObj) && matchesId) {
				this.logger.debug(`   Found matching event data for ${eventId}`);
				return eventObj;
			}

			// Add nested objects/arrays to queue
			if (Array.isArray(current)) {
				queue.push(...(current as unknown[]));
			} else if (typeof current === 'object' && current !== null) {
				queue.push(...(Object.values(current) as unknown[]));
			}
		}

		this.logger.warn(`   Could not find event data for ${eventId} (searched ${visited.size} objects)`);
		return null;
	}

	/**
	 * Extract event description from HTML content
	 * Luma puts description in class "spark-content"
	 */
	private extractDescriptionFromHTML(cheerioInstance: cheerio.CheerioAPI): string | null {
		// Luma's specific class for event description content
		const sparkContent = cheerioInstance('.spark-content').first();
		if (sparkContent.length > 0) {
			const text = sparkContent.text().trim();
			if (text.length > 20) {
				return text;
			}
		}

		return null;
	}

	/**
	 * Extract ticket prices from HTML content
	 * Luma displays ticket information in the page, but not always in JSON
	 */
	private extractPriceFromHTML(cheerioInstance: cheerio.CheerioAPI): LumaTicketType[] | null {
		const tickets: LumaTicketType[] = [];

		try {
			// Method 1: Look for all text content and find price patterns
			const bodyText = cheerioInstance('body').text();

			// Match patterns like: "Early Bird Ticket ($)" followed by price info
			// Or "¥5,000", "$100", etc.
			const pricePattern = /([¥$€£])\s*([\d,]+(?:\.\d{2})?)/g;
			let match: RegExpExecArray | null;

			while ((match = pricePattern.exec(bodyText)) !== null) {
				const currencySymbol = match[1];
				const amountStr = match[2]?.replace(/,/g, '') ?? '0';
				const amount = parseFloat(amountStr);

				// Map currency symbols to codes
				const currencyMap: Record<string, string> = {
					'¥': 'JPY',
					$: 'USD',
					'€': 'EUR',
					'£': 'GBP',
				};

				if (amount > 0) {
					tickets.push({
						price: amount,
						amount: amount,
						currency: currencyMap[currencySymbol] || 'USD',
					});
				}
			}

			// Method 2: Check specific Luma ticket selectors
			cheerioInstance('[data-testid*="ticket"], [class*="ticket"], [class*="Ticket"], [aria-label*="ticket"]').each(
				(_, element) => {
					const text = cheerioInstance(element).text();
					const priceMatch = text.match(/([¥$€£])\s*([\d,]+(?:\.\d{2})?)/);

					if (priceMatch && priceMatch[1] && priceMatch[2]) {
						const currencySymbol = priceMatch[1];
						const amount = parseFloat(priceMatch[2].replace(/,/g, ''));

						const currencyMap: Record<string, string> = {
							'¥': 'JPY',
							$: 'USD',
							'€': 'EUR',
							'£': 'GBP',
						};

						if (amount > 0) {
							tickets.push({
								price: amount,
								amount: amount,
								currency: currencyMap[currencySymbol],
								name: text.substring(0, 100).trim(),
							});
						}
					}
				},
			);

			// Method 3: Check for "Free" events
			if (tickets.length === 0) {
				if (bodyText.toLowerCase().includes('free') || bodyText.includes('無料')) {
					// Event is free, return explicitly
					return [
						{
							price: 0,
							amount: 0,
							currency: 'USD',
						},
					];
				}
			}

			// Remove duplicates based on price
			const uniqueTickets = tickets.filter(
				(ticket, index, self) =>
					index === self.findIndex((t) => t.price === ticket.price && t.currency === ticket.currency),
			);

			if (uniqueTickets.length > 0) {
				this.logger.debug(
					`   Extracted ${uniqueTickets.length} price(s) from HTML: ${uniqueTickets.map((t) => `${t.currency} ${t.price}`).join(', ')}`,
				);
			}

			return uniqueTickets.length > 0 ? uniqueTickets : null;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			this.logger.debug(`   Error extracting price from HTML: ${errorMessage}`);
			return null;
		}
	}

	/**
	 * Check if object is a complete Luma event (not a stub)
	 * Luma events have: api_id/event_id, name, start_at
	 */
	private isCompleteEvent(obj: unknown): obj is LumaEvent {
		if (!obj || typeof obj !== 'object') return false;

		const eventObj = obj as LumaEvent;

		// Must have an ID
		const hasId = eventObj.api_id || eventObj.event_id || eventObj.id;
		if (!hasId) return false;

		// Must have a name/title
		const hasName = eventObj.name || eventObj.title;
		if (!hasName) return false;

		// Must have a start time
		const hasStartTime = eventObj.start_at || eventObj.startAt || eventObj.start || eventObj.start_time;
		if (!hasStartTime) return false;

		// Should have at least one additional field to confirm it's a real event
		const hasAdditionalField =
			eventObj.description ||
			eventObj.url ||
			eventObj.cover_url ||
			eventObj.timezone ||
			eventObj.location_type ||
			eventObj.calendar;

		return !!hasAdditionalField;
	}

	private mapToEventFormat(lumaEvent: LumaEvent): CrawledEvent | null {
		try {
			if (!lumaEvent?.name) {
				this.logger.warn(`Event without name, skipping: ${JSON.stringify(lumaEvent).substring(0, 100)}`);
				return null;
			}

			// Handle various date field names
			if (!lumaEvent?.start_at || !lumaEvent?.end_at) {
				this.logger.warn(`Event "${lumaEvent.name}" missing start time, skipping`);
				return null;
			}

			const startDateTime = new Date(lumaEvent?.start_at);
			const endDateTime = new Date(lumaEvent?.end_at);
			const eventStatus = determineStatus(startDateTime, endDateTime);

			const locationData = this.extractLocation(lumaEvent);
			const priceInfo = this.extractPrice(lumaEvent);
			const description = this.extractEventDescription(lumaEvent);
			const tags = this.extractTags(lumaEvent);

			// Build full event URL
			const eventSlug = lumaEvent.url || lumaEvent.event_url || lumaEvent.api_id;
			const fullEventUrl = eventSlug?.startsWith('http') ? eventSlug : `${this.config.baseUrl}/${eventSlug}`;

			const guestLimit = lumaEvent.guest_limit;
			let eventCapacity: number | undefined = guestLimit !== undefined ? Number(guestLimit) : undefined;
			if (eventCapacity === undefined || eventCapacity === 0 || isNaN(eventCapacity)) {
				eventCapacity = undefined;
			}

			// Extract attendee count
			const attendeeCountRaw = lumaEvent.guest_count || lumaEvent.guests_count || lumaEvent.attendee_count || 0;
			const attendeeCount = typeof attendeeCountRaw === 'number' ? attendeeCountRaw : Number(attendeeCountRaw) || 0;

			return {
				// ===== Event Type =====
				eventType: EventType.ONCE,

				// ===== Basic Information =====
				eventName: lumaEvent.name,
				eventDesc: description,
				eventImages: lumaEvent.cover_url ? [lumaEvent.cover_url] : [],
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
				externalId: lumaEvent.api_id || lumaEvent.id,
				externalUrl: fullEventUrl,

				// ===== References =====
				groupId: undefined,

				// ===== Event Attendees =====
				attendeeCount: attendeeCount,
				eventCapacity: eventCapacity,

				// ===== Data Storage =====
				rawData: lumaEvent,
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			const errorStack = error instanceof Error ? error.stack : undefined;
			this.logger.error(`Error mapping Luma event: ${errorMessage}`, errorStack);
			return null;
		}
	}

	/**
	 * Extract event description from Luma event object
	 * Tries multiple sources: description, summary, geo_address_info.description
	 */
	private extractEventDescription(eventObject: LumaEvent): string {
		// Try direct description field first (this is the actual event description)
		if (eventObject.description && eventObject.description.trim()) {
			return eventObject.description.trim();
		}

		// Try summary field
		if (eventObject.summary && eventObject.summary.trim()) {
			return eventObject.summary.trim();
		}

		// As a last resort, use location description if available
		const geoInfo = eventObject.geo_address_info;
		if (geoInfo?.description && geoInfo.description.trim()) {
			return geoInfo.description.trim();
		}

		// Default fallback
		return 'Event from luma.com';
	}

	/**
	 * Extract tags from Luma event
	 * Extracts from tags, topics, or categories array
	 */
	private extractTags(eventObject: LumaEvent): string[] {
		const tags: string[] = [];

		// Extract from tags/topics/categories array
		const tagSources = eventObject.tags || eventObject.topics || eventObject.categories || [];
		if (Array.isArray(tagSources)) {
			tagSources.forEach((tag: string | { name?: string }) => {
				const tagName = typeof tag === 'string' ? tag : tag?.name;
				if (tagName) tags.push(tagName);
			});
		}

		return tags;
	}

	/**
	 * Extract price information from Luma event
	 * Returns the LOWEST price from all available ticket types
	 */
	private extractPrice(eventObject: LumaEvent): { amount: number | undefined; currency?: string } {
		// Check ticket_types for pricing
		const ticketTypes = eventObject.ticket_types || eventObject.tickets || [];
		if (Array.isArray(ticketTypes) && ticketTypes.length > 0) {
			// Find tickets with valid prices
			const validTickets = ticketTypes
				.map((ticket: LumaTicketType) => ({
					price: parseFloat(String(ticket.price || ticket.amount || 0)),
					currency: ticket.currency,
				}))
				.filter((ticket) => ticket.price > 0);

			if (validTickets.length > 0) {
				// Find the ticket with the minimum price
				const cheapestTicket = validTickets.reduce((min, current) => (current.price < min.price ? current : min));

				return {
					amount: cheapestTicket.price,
					currency: cheapestTicket.currency,
				};
			}
		}

		// Check direct price field
		if (eventObject.price !== undefined && eventObject.price !== null) {
			const amount = parseFloat(String(eventObject.price));
			if (amount > 0) {
				return {
					amount: amount,
					currency: eventObject.currency,
				};
			}
		}

		// Default to free
		return { amount: 0, currency: undefined };
	}

	private extractLocation(eventObject: LumaEvent): {
		type: EventLocationType;
		city?: string;
		address?: string;
		latitude?: number;
		longitude?: number;
	} {
		// Use location_type directly from Luma's API
		const isOnlineEvent = eventObject.location_type !== 'offline';

		const geoInfo = eventObject.geo_address_info;
		const city = geoInfo?.city;

		let address: string | undefined;
		if (geoInfo?.mode === 'obfuscated') {
			// For obfuscated locations, don't use any address
			address = undefined;
		} else if (geoInfo?.full_address) {
			address = geoInfo.full_address;
		} else if (geoInfo?.short_address) {
			address = geoInfo.short_address;
		} else if (geoInfo?.address) {
			address = geoInfo.address;
		}

		// Extract coordinates
		const coordinate = eventObject.coordinate;
		const latitude = coordinate?.latitude;
		const longitude = coordinate?.longitude;

		return {
			type: isOnlineEvent ? EventLocationType.ONLINE : EventLocationType.OFFLINE,
			city: isOnlineEvent ? undefined : city,
			address: address,
			latitude: latitude ? parseFloat(String(latitude)) : undefined,
			longitude: longitude ? parseFloat(String(longitude)) : undefined,
		};
	}
}
