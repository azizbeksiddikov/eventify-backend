import type { Browser, LaunchOptions } from 'puppeteer';

/**
 * Launch Chromium. Puppeteer is loaded here on first use, not at startup, so a batch
 * server that never crawls (WEB_CRAWLING_ENABLED not true) does not pay for loading it.
 */
export async function launchBrowser(options: LaunchOptions): Promise<Browser> {
	const { default: puppeteer } = await import('puppeteer');
	return puppeteer.launch(options);
}
