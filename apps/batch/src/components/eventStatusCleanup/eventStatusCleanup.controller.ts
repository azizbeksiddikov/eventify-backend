import { Controller, Get, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { EventStatusCleanupService } from './eventStatusCleanup.service';

@Controller('event-status-cleanup')
export class EventStatusCleanupController {
	private readonly logger = new Logger(EventStatusCleanupController.name);

	constructor(private readonly eventStatusCleanupService: EventStatusCleanupService) {}

	/**
	 * Manually trigger event status cleanup
	 * GET /event-status-cleanup
	 */
	@Get()
	async cleanupEventStatuses() {
		try {
			const result = await this.eventStatusCleanupService.cleanupEventStatuses();
			return {
				success: true,
				message: 'Event status cleanup completed',
				result,
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			const errorStack = error instanceof Error ? error.stack : undefined;
			this.logger.error(`Error during event status cleanup: ${errorMessage}`, errorStack);
			throw new HttpException(
				{
					success: false,
					message: 'Failed to cleanup event statuses',
					error: errorMessage,
				},
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}
}
