import { Controller, Get, Logger, Param, HttpException, HttpStatus } from '@nestjs/common';
// import { Cron } from '@nestjs/schedule';
import { WebCrawlingService } from './webCrawling.service';

@Controller('web-crawling')
export class WebCrawlingController {
	private readonly logger = new Logger(WebCrawlingController.name);

	constructor(private readonly webCrawlingService: WebCrawlingService) {}

	/**
	 * Get events from all configured scrapers
	 * GET /web-crawling/events
	 */
	@Get('events')
	async getEventCrawling() {
		try {
			this.logger.log('Crawling events from all sources');
			const events = await this.webCrawlingService.getEventCrawling();
			return {
				success: true,
				count: events.length,
				events,
			};
		} catch (error) {
			this.logger.error(`Error during event crawling: ${error.message}`, error.stack);
			throw new HttpException(
				{
					success: false,
					message: 'Failed to crawl events',
					error: error.message,
				},
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}

	/**
	 * Get events from a specific scraper
	 * GET /web-crawling/events/:source
	 * Example: GET /web-crawling/events/meetup.com
	 */
	@Get('events/:source')
	async getEventCrawlingBySource(@Param('source') source: string) {
		try {
			this.logger.log(`Crawling events from source: ${source}`);
			const events = await this.webCrawlingService.getEventCrawlingBySource(source);
			return {
				success: true,
				source,
				count: events.length,
				events,
			};
		} catch (error) {
			this.logger.error(`Error crawling from ${source}: ${error.message}`, error.stack);
			throw new HttpException(
				{
					success: false,
					message: `Failed to crawl events from ${source}`,
					error: error.message,
				},
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}
}
