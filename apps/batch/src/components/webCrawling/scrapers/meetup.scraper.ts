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

@Injectable()
export class MeetupScraper implements IEventScraper {
	private readonly logger = new Logger(MeetupScraper.name);
	private readonly config: ScraperConfig = {
		name: 'meetup',
		baseUrl: 'https://www.meetup.com',
		searchUrl: 'https://www.meetup.com/find/?location=kr--Seoul&source=EVENTS',
		userAgent:
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
	};

	constructor(private readonly httpService: HttpService) {}

	getName(): string {
		return 'meetup.com';
	}

	async scrapeEvents(): Promise<CrawledEvent[]> {
		try {
			this.logger.log(`Crawling ${this.getName()} with Puppeteer (headless browser)`);

			let extractedEvents: CrawledEvent[] = [];

			// Try Puppeteer first for complete results
			try {
				const htmlContent = await this.fetchPageWithPuppeteer(this.config.searchUrl);
				const cheerioInstance = cheerio.load(htmlContent);
				extractedEvents = this.extractEventsFromPage(cheerioInstance);

				this.logger.log(`✅ Puppeteer: Crawled ${extractedEvents.length} events from ${this.getName()}`);
			} catch (puppeteerError) {
				this.logger.warn(`Puppeteer failed: ${puppeteerError.message}`);
				this.logger.log('Falling back to HTTP-only scraping (will get ~12 events instead of 40+)');

				// Fallback to simple HTTP request
				const cheerioInstance = await this.fetchPage(this.config.searchUrl);
				extractedEvents = this.extractEventsFromPage(cheerioInstance);

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
	 * Save scraped events to jsons/meetup.json
	 */
	private async saveToJsonFile(events: CrawledEvent[]): Promise<void> {
		try {
			// Create jsons directory if it doesn't exist
			const jsonsDir = path.join(process.cwd(), 'jsons');
			if (!fs.existsSync(jsonsDir)) {
				fs.mkdirSync(jsonsDir, { recursive: true });
				this.logger.log('📁 Created jsons directory');
			}

			// Prepare data with metadata
			const dataToSave = {
				metadata: {
					source: this.getName(),
					scrapedAt: new Date().toISOString(),
					totalEvents: events.length,
					url: this.config.searchUrl,
				},
				events: events,
			};

			// Write to file
			const filePath = path.join(jsonsDir, 'meetup.json');
			fs.writeFileSync(filePath, JSON.stringify(dataToSave, null, 2), 'utf-8');

			this.logger.log(`💾 Saved ${events.length} events to jsons/meetup.json`);
		} catch (error) {
			this.logger.warn(`Failed to save to JSON file: ${error.message}`);
			// Don't throw - saving is optional, scraping should continue
		}
	}

	/**
	 * Fetch page using Puppeteer and intercept API requests
	 * This captures ALL events loaded via API calls during scrolling
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
			await page.setUserAgent(
				this.config.userAgent ||
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
			);

			// 🔥 INTERCEPT NETWORK REQUESTS - Capture API responses
			await page.setRequestInterception(true);

			page.on('request', (request) => {
				request.continue();
			});

			page.on('response', async (response) => {
				const responseUrl = response.url();

				// Capture GraphQL API responses (Meetup uses GraphQL)
				if (responseUrl.includes('/gql') || responseUrl.includes('graphql')) {
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

			// Wait for initial events
			this.logger.log('⏳ Waiting for events to load...');
			await page.waitForSelector('script[type="application/json"]', { timeout: 15000 });

			// Scroll to trigger API calls
			this.logger.log('📜 Scrolling to trigger API calls (10 rounds)...');
			for (let i = 0; i < 10; i++) {
				await this.autoScroll(page);
				this.logger.log(`   ✓ Scroll ${i + 1}/10`);
				await new Promise((resolve) => setTimeout(resolve, 1500)); // Wait for API calls
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
	 * Auto-scroll the page AGGRESSIVELY to trigger infinite scroll
	 * Scrolls fast and far to load all content
	 */
	private async autoScroll(page: any): Promise<void> {
		await page.evaluate(async () => {
			await new Promise<void>((resolve) => {
				let totalHeight = 0;
				const distance = 1000; // VERY aggressive: 1000px at a time!
				const maxScrolls = 300; // Very high limit
				let scrollCount = 0;

				const timer = setInterval(() => {
					const scrollHeight = document.body.scrollHeight;
					window.scrollBy(0, distance);
					totalHeight += distance;
					scrollCount++;

					// Stop if reached bottom or max scrolls
					if (totalHeight >= scrollHeight || scrollCount >= maxScrolls) {
						clearInterval(timer);
						// Scroll to absolute bottom to be 100% sure
						window.scrollTo(0, document.body.scrollHeight);
						resolve();
					}
				}, 50); // Very fast: scroll every 50ms
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

	private extractEventsFromPage(cheerioInstance: cheerio.CheerioAPI): CrawledEvent[] {
		// Try JSON extraction first (most reliable for meetup.com)
		const eventsFromJson = this.extractFromJson(cheerioInstance);
		if (eventsFromJson.length > 0) {
			this.logger.log(`Extracted ${eventsFromJson.length} events from JSON data`);
			return eventsFromJson;
		}

		// Fallback to HTML parsing
		return this.extractFromHtml(cheerioInstance);
	}

	private extractFromJson(cheerioInstance: cheerio.CheerioAPI): CrawledEvent[] {
		const extractedEvents: CrawledEvent[] = [];
		const processedEventIds = new Set<string>();
		const duplicateStats = { total: 0, duplicates: 0 };
		let aggregatedJsonData: any = null;

		// Extract and merge all JSON script tags embedded in the page
		cheerioInstance('script[type="application/json"]').each((index, scriptElement) => {
			try {
				const jsonText = cheerioInstance(scriptElement).html();
				if (jsonText) {
					const parsedJsonData = JSON.parse(jsonText);
					aggregatedJsonData = aggregatedJsonData
						? this.mergeJsonData(aggregatedJsonData, parsedJsonData)
						: parsedJsonData;
				}
			} catch (error) {
				// Not valid JSON, skip
			}
		});

		if (!aggregatedJsonData) {
			return extractedEvents;
		}

		// Recursively search for event objects in the JSON data
		this.searchForEvents(aggregatedJsonData, aggregatedJsonData, extractedEvents, processedEventIds, duplicateStats);

		// Log deduplication stats
		if (duplicateStats.duplicates > 0) {
			this.logger.log(
				`🔍 Deduplication: Found ${duplicateStats.total} total, ` +
					`skipped ${duplicateStats.duplicates} duplicates, ` +
					`kept ${extractedEvents.length} unique events`,
			);
		} else {
			this.logger.log(`✅ All ${extractedEvents.length} events are unique (no duplicates found)`);
		}

		return extractedEvents;
	}

	private searchForEvents(
		currentObject: any,
		completeJsonData: any,
		extractedEvents: CrawledEvent[],
		processedEventIds: Set<string>,
		duplicateStats?: { total: number; duplicates: number },
	): void {
		if (!currentObject || typeof currentObject !== 'object') return;

		// Handle arrays recursively
		if (Array.isArray(currentObject)) {
			currentObject.forEach((arrayItem) =>
				this.searchForEvents(arrayItem, completeJsonData, extractedEvents, processedEventIds, duplicateStats),
			);
			return;
		}

		// Check if this object is a Meetup event (GraphQL format)
		const isMeetupGraphQLEvent = currentObject.__typename === 'Event' && (currentObject.title || currentObject.id);

		// Check if this object has event-like fields (generic format)
		const hasEventFields =
			(currentObject.name || currentObject.title || currentObject.eventName) &&
			(currentObject.url || currentObject.href || currentObject.link || currentObject.eventUrl);

		if (isMeetupGraphQLEvent || hasEventFields) {
			const eventId = currentObject.id || currentObject.eventId || `${currentObject.title}-${currentObject.dateTime}`;

			if (duplicateStats) duplicateStats.total++;

			// Skip if we've already processed this event
			if (eventId && processedEventIds.has(eventId)) {
				if (duplicateStats) duplicateStats.duplicates++;

				return; // DUPLICATE - Skip it
			}

			if (eventId) {
				processedEventIds.add(eventId);
			}

			try {
				const extractedEventData = this.extractEventFromJsonObject(currentObject, completeJsonData);
				if (extractedEventData.eventName) {
					extractedEvents.push(extractedEventData);
				}
			} catch (error) {
				this.logger.warn(`Error extracting event from JSON: ${error.message}`);
			}
		}

		// Continue searching nested objects recursively
		Object.keys(currentObject).forEach((propertyKey) => {
			this.searchForEvents(
				currentObject[propertyKey],
				completeJsonData,
				extractedEvents,
				processedEventIds,
				duplicateStats,
			);
		});
	}

	private extractEventFromJsonObject(jsonEventObject: any, completeJsonData: any): CrawledEvent {
		const startDateTime = new Date(
			jsonEventObject.dateTime || jsonEventObject.startTime || jsonEventObject.date || jsonEventObject.time || '',
		);
		const endDateTime = new Date(jsonEventObject.endTime || jsonEventObject.endDateTime || jsonEventObject.end || '');

		const imageUrl = this.extractImageUrl(jsonEventObject, completeJsonData);
		const eventName = jsonEventObject.title || jsonEventObject.name || jsonEventObject.eventName || '';

		const linkHref =
			jsonEventObject.eventUrl || jsonEventObject.link?.href || jsonEventObject.href || jsonEventObject.url;
		const absoluteEventUrl = linkHref?.startsWith('http')
			? linkHref
			: linkHref
				? `${this.config.baseUrl}${linkHref}`
				: '';

		// Extract comprehensive raw data for LLM filtering
		const enrichedRawData = {
			// Original data
			...jsonEventObject,

			// Organizer/Group information
			organizer: {
				name: jsonEventObject.group?.name || jsonEventObject.organizer?.name || jsonEventObject.host?.name,
				id: jsonEventObject.group?.id || jsonEventObject.group?.urlname || jsonEventObject.organizer?.id,
				urlname: jsonEventObject.group?.urlname || jsonEventObject.organizer?.urlname,
				description: jsonEventObject.group?.description || jsonEventObject.organizer?.description,
				memberCount: jsonEventObject.group?.membersCount || jsonEventObject.group?.members,
				category: jsonEventObject.group?.category || jsonEventObject.category,
				link: jsonEventObject.group?.link || jsonEventObject.group?.urlname,
			},

			// Event details
			eventDetails: {
				title: eventName,
				description: jsonEventObject.description || jsonEventObject.summary || jsonEventObject.details,
				shortDescription: jsonEventObject.excerpt || jsonEventObject.shortDescription,
				duration: jsonEventObject.duration,
				going: jsonEventObject.going || jsonEventObject.attendeeCount || 0,
				waitlistCount: jsonEventObject.waitlistCount,
				maxTickets: jsonEventObject.maxTickets,
				capacity: jsonEventObject.capacity,
				isPaidEvent: jsonEventObject.isPaidEvent || jsonEventObject.hasFees || false,
				eventType: jsonEventObject.eventType,
				eventUrl: absoluteEventUrl,
			},

			// Location details
			locationDetails: {
				type: jsonEventObject.eventType,
				isOnline: jsonEventObject.isOnline,
				venue: jsonEventObject.venue,
				address: jsonEventObject.venue?.address || jsonEventObject.location?.address,
				city: jsonEventObject.venue?.city || jsonEventObject.location?.city || 'Seoul',
				country: jsonEventObject.venue?.country || jsonEventObject.location?.country,
				lat: jsonEventObject.venue?.lat || jsonEventObject.location?.lat,
				lon: jsonEventObject.venue?.lon || jsonEventObject.location?.lon,
			},

			// Topics/Tags/Categories
			topics: jsonEventObject.topics || [],
			tags: jsonEventObject.tags || [],
			keywords: jsonEventObject.keywords || [],

			// Timing
			dateTime: startDateTime.toISOString(),
			endTime: endDateTime.toString() !== 'Invalid Date' ? endDateTime.toISOString() : null,
			timezone: jsonEventObject.timezone,

			// Images
			images: {
				main: imageUrl,
				featuredPhoto: jsonEventObject.featuredEventPhoto,
				allPhotos: jsonEventObject.photos || [],
			},

			// Metadata for LLM
			metadata: {
				source: 'meetup.com',
				scrapedAt: new Date().toISOString(),
				hasDescription: !!(jsonEventObject.description || jsonEventObject.summary),
				hasImage: !!imageUrl,
				hasVenue: !!(jsonEventObject.venue || jsonEventObject.location),
			},
		};

		return {
			isRealEvent: true,
			eventType: EventType.ONCE,
			eventName: eventName.substring(0, 100) || 'Untitled Event',
			eventDesc:
				jsonEventObject.description || jsonEventObject.summary || jsonEventObject.details || 'No description available',
			eventImages: imageUrl ? [imageUrl] : [],
			eventStartAt: startDateTime,
			eventEndAt:
				endDateTime.toString() !== 'Invalid Date'
					? endDateTime
					: new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000),
			eventPrice: 0,
			eventStatus: determineStatus(
				startDateTime,
				endDateTime.toString() !== 'Invalid Date'
					? endDateTime
					: new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000),
			),
			eventCategories: [],
			attendeeCount:
				jsonEventObject.rsvps?.totalCount ||
				jsonEventObject.attendees?.count ||
				jsonEventObject.attendees?.current ||
				jsonEventObject.attendeeCount ||
				jsonEventObject.going ||
				0,
			eventCapacity:
				jsonEventObject.maxTickets ||
				jsonEventObject.attendees?.capacity ||
				jsonEventObject.capacity ||
				jsonEventObject.maxAttendees ||
				undefined,
			eventUrl: absoluteEventUrl,
			location: this.extractLocation(jsonEventObject),
			rawData: enrichedRawData,
		};
	}

	private extractLocation(eventObject: any): EventLocation {
		const isOnlineEvent =
			eventObject.eventType === 'ONLINE' ||
			eventObject.eventType === 'VIRTUAL' ||
			eventObject.isOnline ||
			(eventObject.eventType === 'PHYSICAL') === false;

		const venueAddress =
			eventObject.venue?.address ||
			eventObject.venue?.name ||
			eventObject.location?.address ||
			eventObject.location?.name ||
			eventObject.address;

		return {
			type: isOnlineEvent ? 'online' : 'offline',
			eventCity: isOnlineEvent ? undefined : 'Seoul',
			address: venueAddress,
		};
	}

	private extractImageUrl(eventObject: any, completeJsonData: any): string | undefined {
		// Try direct image URLs first
		const directImageUrl =
			eventObject.image || eventObject.imageUrl || eventObject.photo?.url || eventObject.coverPhoto?.url;

		if (directImageUrl) {
			return directImageUrl;
		}

		// Try featuredEventPhoto with baseUrl (GraphQL API format)
		const featuredPhoto = eventObject.featuredEventPhoto;
		if (featuredPhoto?.baseUrl && featuredPhoto?.id) {
			const { baseUrl, id: photoId } = featuredPhoto;
			return `${baseUrl}${photoId}/676x380.webp`;
		}

		// Try to resolve GraphQL photo reference (__ref format)
		if (featuredPhoto?.__ref) {
			const photoId = this.extractPhotoIdFromReference(featuredPhoto.__ref);
			if (photoId) {
				const photoInfo = this.findPhotoInfoInJson(photoId, completeJsonData);

				if (photoInfo?.baseUrl) {
					return `${photoInfo.baseUrl}${photoId}/676x380.webp`;
				}

				const resolvedPhotoUrl = photoInfo?.url || photoInfo?.src || photoInfo?.photoUrl;
				if (resolvedPhotoUrl) {
					return resolvedPhotoUrl;
				}

				// Construct URL using known Meetup CDN pattern
				return `https://secure-content.meetupstatic.com/images/classic-events/${photoId}/676x380.webp`;
			}
		}

		// Final fallback
		return featuredPhoto?.url;
	}

	private extractPhotoIdFromReference(photoReference: string): string | null {
		// Extract numeric photo ID from GraphQL reference format: "PhotoInfo:123456"
		const photoIdMatch = photoReference.match(/PhotoInfo:(\d+)/);
		return photoIdMatch ? photoIdMatch[1] : null;
	}

	private findPhotoInfoInJson(targetPhotoId: string, jsonData: any): any {
		if (!jsonData || typeof jsonData !== 'object') return null;

		const recursiveSearch = (currentObject: any): any => {
			if (!currentObject || typeof currentObject !== 'object') return null;

			// Search through arrays
			if (Array.isArray(currentObject)) {
				for (const arrayItem of currentObject) {
					const searchResult = recursiveSearch(arrayItem);
					if (searchResult) return searchResult;
				}
			} else {
				// Check if this is the PhotoInfo object we're looking for (GraphQL format)
				const isTargetPhotoInfo =
					currentObject.__typename === 'PhotoInfo' &&
					(currentObject.id === targetPhotoId || currentObject.photoId === targetPhotoId);

				if (isTargetPhotoInfo) {
					return currentObject;
				}

				// Check if this object has the photo ID with image data
				const hasPhotoData =
					currentObject.id === targetPhotoId && (currentObject.baseUrl || currentObject.url || currentObject.src);

				if (hasPhotoData) {
					return currentObject;
				}

				// Continue searching nested objects recursively
				for (const propertyKey in currentObject) {
					if (currentObject.hasOwnProperty(propertyKey)) {
						const searchResult = recursiveSearch(currentObject[propertyKey]);
						if (searchResult) return searchResult;
					}
				}
			}

			return null;
		};

		return recursiveSearch(jsonData);
	}

	private extractFromHtml(cheerioInstance: cheerio.CheerioAPI): CrawledEvent[] {
		const extractedEvents: CrawledEvent[] = [];

		// Find all event links on the page
		const eventLinkElements = cheerioInstance('a[href*="/events/"]');
		if (eventLinkElements.length === 0) {
			return extractedEvents;
		}

		this.logger.log(`Found ${eventLinkElements.length} event links, attempting extraction`);
		const processedUrls = new Set<string>();

		eventLinkElements.each((index, linkElement) => {
			try {
				const $linkElement = cheerioInstance(linkElement);
				const linkHref = $linkElement.attr('href') || '';

				// Skip if URL is empty or already processed
				if (!linkHref || processedUrls.has(linkHref)) return;
				processedUrls.add(linkHref);

				// Find parent container with meaningful content (traverse up to 3 levels)
				let $parentContainer = $linkElement.parent();
				for (let level = 0; level < 3 && $parentContainer.length > 0; level++) {
					const containerTextLength = $parentContainer.text().trim().length;
					if (containerTextLength > 30) break; // Found container with enough content
					$parentContainer = $parentContainer.parent();
				}

				const extractedEvent = this.extractEventFromLink($linkElement, $parentContainer, cheerioInstance);
				if (extractedEvent && extractedEvent.eventName) {
					extractedEvents.push(extractedEvent);
				}
			} catch (error) {
				this.logger.warn(`Error extracting from link: ${error.message}`);
			}
		});

		return extractedEvents;
	}

	private extractEventFromLink(
		$linkElement: cheerio.Cheerio<any>,
		$containerElement: cheerio.Cheerio<any>,
		cheerioInstance: cheerio.CheerioAPI,
	): CrawledEvent | null {
		const linkHref = $linkElement.attr('href') || '';
		const absoluteEventUrl = linkHref.startsWith('http') ? linkHref : `${this.config.baseUrl}${linkHref}`;

		// Extract event name from various possible locations
		const eventName =
			$linkElement.text().trim() ||
			$linkElement.find('span').first().text().trim() ||
			$containerElement.find('h1, h2, h3, h4').first().text().trim() ||
			'';

		// Validate event name
		if (!eventName || eventName.length < 3) {
			return null;
		}

		// Extract date/time information
		const dateTimeText =
			$containerElement.find('time').attr('datetime') ||
			$containerElement.find('time').text().trim() ||
			$containerElement.find('[class*="date"]').text().trim() ||
			'';

		// Extract location information
		const locationText = $containerElement.find('[class*="location"]').text().trim() || '';
		const isOnlineEvent = locationText.toLowerCase().includes('online');

		// Extract other event details
		const eventDescription = $containerElement.find('p').first().text().trim() || '';
		const eventImageUrl = $containerElement.find('img').first().attr('src');
		const groupName = $containerElement.find('a[href*="/groups/"]').text().trim() || '';

		// Create image array
		const eventImagesArray = eventImageUrl ? [eventImageUrl] : [];

		// Parse dates (simple fallback since we don't have end date from HTML)
		const eventStartDate = dateTimeText ? new Date(dateTimeText) : new Date();
		const eventEndDate = new Date(eventStartDate.getTime() + 2 * 60 * 60 * 1000); // Add 2 hours

		return {
			isRealEvent: true,
			eventType: EventType.ONCE,
			eventName: eventName.substring(0, 100),
			eventDesc: eventDescription.substring(0, 2000) || 'No description available',
			eventImages: eventImagesArray,
			eventStartAt: eventStartDate,
			eventEndAt: eventEndDate,
			eventPrice: 0,
			eventStatus: determineStatus(eventStartDate, eventEndDate),
			eventCategories: [],
			attendeeCount: 0,
			eventCapacity: undefined,
			eventUrl: absoluteEventUrl,
			location: {
				type: isOnlineEvent ? 'online' : 'offline',
				eventCity: isOnlineEvent ? undefined : 'Seoul',
				address: isOnlineEvent ? undefined : locationText,
			},
			rawData: {
				html: $containerElement.html(),
				text: $containerElement.text(),
			},
		};
	}

	private mergeJsonData(firstJsonData: any, secondJsonData: any): any {
		const bothAreArrays = Array.isArray(firstJsonData) && Array.isArray(secondJsonData);
		if (bothAreArrays) {
			return [...firstJsonData, ...secondJsonData];
		}

		const bothAreObjects = typeof firstJsonData === 'object' && typeof secondJsonData === 'object';
		if (bothAreObjects) {
			return { ...firstJsonData, ...secondJsonData };
		}

		// Return second data if available, otherwise first
		return secondJsonData || firstJsonData;
	}
}
