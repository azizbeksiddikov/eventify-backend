import { Injectable, Logger } from '@nestjs/common';
import type { ObjectId } from 'mongoose';
import { Agenda } from 'agenda';
import { EventJobStatus } from '../../libs/enums/event.enum';

@Injectable()
export class AgendaService {
	private readonly logger = new Logger(AgendaService.name);
	private agenda: Agenda;

	constructor() {
		this.agenda = new Agenda({
			db: { address: process.env.MONGODB_URI as string },
		});

		this.logger.log('AgendaJS initialized for job scheduling');
	}

	public async scheduleEventStart(eventId: ObjectId, startAt: Date): Promise<void> {
		try {
			await this.agenda.schedule(startAt, EventJobStatus.EVENT_START, { eventId: eventId.toString() });
			this.logger.log(
				`Scheduled ${EventJobStatus.EVENT_START} job for event ${eventId.toString()} at ${startAt.toISOString()}`,
			);
		} catch (error) {
			this.logger.error(`Failed to schedule ${EventJobStatus.EVENT_START} job for event ${eventId.toString()}:`, error);
			// Don't throw - don't block event creation if scheduling fails
		}
	}

	public async scheduleEventEnd(eventId: ObjectId, endAt: Date): Promise<void> {
		try {
			await this.agenda.schedule(endAt, EventJobStatus.EVENT_END, { eventId: eventId.toString() });
			this.logger.log(
				`Scheduled ${EventJobStatus.EVENT_END} job for event ${eventId.toString()} at ${endAt.toISOString()}`,
			);
		} catch (error) {
			this.logger.error(`Failed to schedule ${EventJobStatus.EVENT_END} job for event ${eventId.toString()}:`, error);
			// Don't throw - don't block event creation if scheduling fails
		}
	}

	public async cancelEventJobs(eventId: ObjectId): Promise<void> {
		try {
			const eventIdStr = eventId.toString();
			await this.agenda.cancel({
				name: { $in: [EventJobStatus.EVENT_START, EventJobStatus.EVENT_END] },
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
