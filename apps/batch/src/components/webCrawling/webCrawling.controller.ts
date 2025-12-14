import { Controller, Get, Logger, Query, HttpException, HttpStatus } from '@nestjs/common';
import { WebCrawlingService } from './webCrawling.service';

@Controller('web-crawling')
export class WebCrawlingController {
	private readonly logger = new Logger(WebCrawlingController.name);

	constructor(private readonly webCrawlingService: WebCrawlingService) {}

	/**
	 * Get events from all configured scrapers
	 * GET /web-crawling/events
	 * GET /web-crawling/events?limit=2&isTest=true  (for testing)
	 */
	@Get('events')
	async getEventCrawling(@Query('limit') limit?: string, @Query('isTest') isTest?: string) {
		try {
			const limitNum = limit ? parseInt(limit, 10) : undefined;
			const testMode = isTest ? true : false;

			const events = await this.webCrawlingService.getEventCrawling(limitNum, testMode);
			return {
				success: true,
				count: events.length,
				testMode: testMode,
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
}
