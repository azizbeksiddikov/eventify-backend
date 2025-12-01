import { Controller, Get, Logger, Param, Query, HttpException, HttpStatus } from '@nestjs/common';
// import { Cron } from '@nestjs/schedule';
import { WebCrawlingService } from './webCrawling.service';

@Controller('web-crawling')
export class WebCrawlingController {
	private readonly logger = new Logger(WebCrawlingController.name);

	constructor(private readonly webCrawlingService: WebCrawlingService) {}

	/**
	 * Get events from all configured scrapers
	 * GET /web-crawling/events
	 * GET /web-crawling/events?limit=10  (for testing)
	 */
	@Get('events')
	async getEventCrawling(@Query('limit') limit?: string) {
		try {
			const limitNum = limit ? parseInt(limit, 10) : undefined;

			if (limitNum) {
				this.logger.log(`🧪 TEST MODE: Crawling with limit of ${limitNum} events per source`);
			} else {
				this.logger.log('Crawling events from all sources');
			}

			const events = await this.webCrawlingService.getEventCrawling(limitNum);
			return {
				success: true,
				count: events.length,
				testMode: !!limitNum,
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
	 * GET /web-crawling/events/:source?limit=10  (for testing)
	 * Example: GET /web-crawling/events/meetup.com?limit=5
	 */
	@Get('events/:source')
	async getEventCrawlingBySource(@Param('source') source: string, @Query('limit') limit?: string) {
		try {
			const limitNum = limit ? parseInt(limit, 10) : undefined;

			if (limitNum) {
				this.logger.log(`🧪 TEST MODE: Crawling ${source} with limit of ${limitNum} events`);
			} else {
				this.logger.log(`Crawling events from source: ${source}`);
			}

			const events = await this.webCrawlingService.getEventCrawlingBySource(source, limitNum);
			return {
				success: true,
				source,
				count: events.length,
				testMode: !!limitNum,
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
