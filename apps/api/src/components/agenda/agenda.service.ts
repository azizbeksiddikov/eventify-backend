import { Injectable, Logger } from '@nestjs/common';
import type { ObjectId } from 'mongoose';
import { Agenda } from 'agenda';

@Injectable()
export class AgendaService {
	private readonly logger = new Logger(AgendaService.name);
	private agenda: Agenda;

	constructor() {
		const mongoUri = process.env.NODE_ENV === 'production' ? process.env.MONGO_PROD : process.env.MONGO_DEV;

		this.agenda = new Agenda({
			db: { address: mongoUri as string },
		});

		this.logger.log('AgendaJS initialized for job scheduling');
	}

	public async scheduleEventStart(eventId: ObjectId, startAt: Date): Promise<void> {
		try {
			await this.agenda.schedule(startAt, 'event-start', { eventId: eventId.toString() });
			this.logger.log(`Scheduled event-start job for event ${eventId.toString()} at ${startAt.toISOString()}`);
		} catch (error) {
			this.logger.error(`Failed to schedule event-start job for event ${eventId.toString()}:`, error);
			// Don't throw - don't block event creation if scheduling fails
		}
	}

	public async scheduleEventEnd(eventId: ObjectId, endAt: Date): Promise<void> {
		try {
			await this.agenda.schedule(endAt, 'event-end', { eventId: eventId.toString() });
			this.logger.log(`Scheduled event-end job for event ${eventId.toString()} at ${endAt.toISOString()}`);
		} catch (error) {
			this.logger.error(`Failed to schedule event-end job for event ${eventId.toString()}:`, error);
			// Don't throw - don't block event creation if scheduling fails
		}
	}

	public async cancelEventJobs(eventId: ObjectId): Promise<void> {
		try {
			const eventIdStr = eventId.toString();
			await this.agenda.cancel({
				name: { $in: ['event-start', 'event-end'] },
				'data.eventId': eventIdStr,
			});
			this.logger.log(`Cancelled all jobs for event ${eventIdStr}`);
		} catch (error) {
			this.logger.error(`Failed to cancel jobs for event ${eventId.toString()}:`, error);
			// Don't throw - continue with event update/delete even if cancellation fails
		}
	}

	public async rescheduleEventJobs(eventId: ObjectId, startAt: Date, endAt: Date): Promise<void> {
		try {
			// Cancel existing jobs first
			await this.cancelEventJobs(eventId);

			// Schedule new jobs
			await this.scheduleEventStart(eventId, startAt);
			await this.scheduleEventEnd(eventId, endAt);

			this.logger.log(`Rescheduled jobs for event ${eventId.toString()}`);
		} catch (error) {
			this.logger.error(`Failed to reschedule jobs for event ${eventId.toString()}:`, error);
			// Don't throw - continue with event update even if rescheduling fails
		}
	}
}
