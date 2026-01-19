import { Controller, Get, Logger, Query, HttpException, HttpStatus } from '@nestjs/common';
import { WebCrawlingService } from './webCrawling.service';

@Controller('web-crawling')
export class WebCrawlingController {
	private readonly logger = new Logger(WebCrawlingController.name);

	constructor(private readonly webCrawlingService: WebCrawlingService) {}

	/**
	 * Get events with sequential processing for memory efficiency.
	 * GET /web-crawling/events
	 * GET /web-crawling/events?limit=5&isTest=true
	 */
	@Get('events')
	async getEventCrawling(@Query('limit') limit?: string, @Query('isTest') isTest?: string) {
		try {
			const limitNum = limit ? parseInt(limit, 10) : undefined;
			const testMode = isTest?.toLowerCase() === 'true';

			this.logger.log(`Starting crawling (limit=${limitNum}, testMode=${testMode})`);

			const result = await this.webCrawlingService.getEventCrawling(limitNum, testMode);

			return {
				success: true,
				mode: 'optimized_sequential',
				stats: {
					scraped: result.stats.scraped,
					accepted: result.stats.accepted,
					rejected: result.stats.rejected,
					saved: result.stats.saved,
				},
				events: result.events,
				testMode: testMode,
				message: testMode
					? 'Events processed but not saved (test mode). Check console for memory usage logs.'
					: 'Events processed and saved to database. Check console for memory usage logs.',
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			const errorStack = error instanceof Error ? error.stack : undefined;
			this.logger.error(`Error during event crawling: ${errorMessage}`, errorStack);
			throw new HttpException(
				{
					success: false,
					mode: 'optimized_sequential',
					message: 'Failed to crawl events',
					error: errorMessage,
				},
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}
}
