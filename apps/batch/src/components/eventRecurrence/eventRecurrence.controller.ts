import { Controller, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EventRecurrenceService } from './eventRecurrence.service';

@Controller()
export class EventRecurrenceController {
	private readonly logger = new Logger(EventRecurrenceController.name);

	constructor(private readonly eventRecurrenceService: EventRecurrenceService) {}

	@Cron('0 2 * * *') // Every day at 02:00 AM
	async generateRecurringEvents() {
		try {
			this.logger.log('Starting daily event generation for recurring events...');
			await this.eventRecurrenceService.generateRecurringEvents();
			this.logger.log('Completed daily event generation for recurring events');
		} catch (error) {
			this.logger.error(`Error during daily event generation: ${error.message}`, error.stack);
		}
	}
}
