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
			const testMode = isTest ? true : false;

			this.logger.log(`Starting crawling (limit=${limitNum}, testMode=${testMode})`);

			const processedCount = await this.webCrawlingService.getEventCrawling(limitNum, testMode);

			return {
				success: true,
				mode: 'optimized_sequential',
				processedCount: processedCount,
				testMode: testMode,
				message: testMode
					? 'Events processed but not saved (test mode). Check console for memory usage logs.'
					: 'Events processed and saved to database. Check console for memory usage logs.',
			};
		} catch (error) {
			this.logger.error(`Error during event crawling: ${error.message}`, error.stack);
			throw new HttpException(
				{
					success: false,
					mode: 'optimized_sequential',
					message: 'Failed to crawl events',
					error: error.message,
				},
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}
}
