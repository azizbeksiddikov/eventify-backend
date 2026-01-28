/***********************
 * CONFIGURATION     *
 ***********************/

// Add any batch-specific configuration here
// Example: export const BATCH_LOOKBACK_DAYS = 30;
export const BROWSER_USER_AGENT =
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

// Puppeteer configuration
export const PUPPETEER_CONFIG = {
	HEADLESS: true,
	TIMEOUT_MS: 60000, // 60 seconds
	WAIT_UNTIL: 'domcontentloaded' as const,
	VIEWPORT: {
		width: 1920,
		height: 1080,
	},
} as const;

// Scrolling configuration
export const SCROLL_CONFIG = {
	MEETUP: {
		ROUNDS: 10,
		MAX_SCROLLS: 100,
		PIXELS_PER_SCROLL: 1000,
		INTERVAL_MS: 50,
		WAIT_BETWEEN_ROUNDS_MS: 3000,
		FINAL_WAIT_MS: 5000,
	},
	LUMA: {
		ROUNDS: 10, // Increased from 5 to load more events
		PIXELS_PER_SCROLL: 800,
		MAX_SCROLLS: 300,
		INTERVAL_MS: 100,
		WAIT_BETWEEN_ROUNDS_MS: 3000, // Increased to 3 seconds for slower API
		FINAL_WAIT_MS: 5000, // Increased to 5 seconds for final load
	},
} as const;

// Scraper URLs
export const SCRAPER_URLS = {
	MEETUP: {
		BASE: 'https://www.meetup.com',
		SEARCH: 'https://www.meetup.com/find/?location=kr--Seoul&source=EVENTS',
	},
	LUMA: {
		BASE: 'https://luma.com',
		// TODO: Change back to Seoul when Seoul has events: 'https://luma.com/seoul'
		SEARCH: 'https://luma.com/seoul',
	},
} as const;

// Default values
export const SCRAPER_DEFAULTS = {
	USER_AGENT: BROWSER_USER_AGENT,
	EVENT_DEFAULT_DURATION_HOURS: 2,
	DEFAULT_TIMEZONE: 'Asia/Seoul',
} as const;

// Batch processing configuration for scrapers
export const BATCH_CONFIG = {
	// Retry configuration
	MAX_RETRIES: 3, // Number of retry attempts per event (increased from 2)
	BASE_DELAY_MS: 2000, // Base delay between requests (2 seconds)
	RETRY_BACKOFF_MULTIPLIER: 2, // Exponential backoff multiplier

	// Rate limiting
	MIN_DELAY_BETWEEN_REQUESTS_MS: 1500, // Minimum delay between requests
	MAX_DELAY_BETWEEN_REQUESTS_MS: 3000, // Maximum delay (randomized)

	// Browser configuration
	HEADLESS: true, // Set to true for production batch jobs
} as const;
