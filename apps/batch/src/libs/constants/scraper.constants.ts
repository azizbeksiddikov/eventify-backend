/**
 * Web Scraping Configuration Constants
 */

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
		PIXELS_PER_SCROLL: 1000,
		INTERVAL_MS: 50,
		WAIT_BETWEEN_ROUNDS_MS: 2000,
		FINAL_WAIT_MS: 5000,
	},
	LUMA: {
		ROUNDS: 5,
		PIXELS_PER_SCROLL: 1000,
		INTERVAL_MS: 100,
		WAIT_BETWEEN_ROUNDS_MS: 2000,
		FINAL_WAIT_MS: 3000,
	},
} as const;

// Scraper URLs
export const SCRAPER_URLS = {
	MEETUP: {
		BASE: 'https://www.meetup.com',
		SEARCH: 'https://www.meetup.com/find/?location=kr--Seoul&source=EVENTS',
	},
	LUMA: {
		BASE: 'https://lu.ma',
		SEARCH: 'https://luma.com/seoul',
	},
} as const;

// Default values
export const SCRAPER_DEFAULTS = {
	USER_AGENT:
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
	EVENT_DEFAULT_DURATION_HOURS: 2,
	DEFAULT_TIMEZONE: 'Asia/Seoul',
} as const;
