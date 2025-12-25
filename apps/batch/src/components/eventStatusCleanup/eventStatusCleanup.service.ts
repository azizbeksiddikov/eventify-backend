import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Event } from '@app/api/src/libs/dto/event/event';
import { EventStatus } from '@app/api/src/libs/enums/event.enum';
import { determineStatus } from '../../libs/utils';
import { AgendaService } from '../../agenda/agenda.service';

@Injectable()
export class EventStatusCleanupService {
	private readonly logger = new Logger(EventStatusCleanupService.name);

	constructor(
		@InjectModel('Event') private readonly eventModel: Model<Event>,
		private readonly agendaService: AgendaService,
	) {}

	/**
	 * Cleanup event statuses based on current time
	 * Updates events that should be ONGOING or COMPLETED based on their start/end times
	 */
	async cleanupEventStatuses(): Promise<{
		upcomingToOngoing: number;
		ongoingToCompleted: number;
		upcomingToCompleted: number;
		total: number;
	}> {
		this.logger.log('Starting event status cleanup...');
		const now = new Date();

		let upcomingToOngoing = 0;
		let ongoingToCompleted = 0;
		let upcomingToCompleted = 0;

		try {
			// Find events that are UPCOMING but should be ONGOING or COMPLETED
			const upcomingEvents = await this.eventModel
				.find({
					eventStatus: EventStatus.UPCOMING,
					eventStartAt: { $lte: now }, // Started or should have started
				})
				.exec();

			for (const event of upcomingEvents) {
				const eventId = (event._id as unknown as { toString(): string }).toString();
				const correctStatus = determineStatus(event.eventStartAt, event.eventEndAt);
				if (correctStatus !== event.eventStatus) {
					const oldStatus = event.eventStatus;
					event.eventStatus = correctStatus;
					await event.save();

					// Handle agenda jobs based on status change
					if (correctStatus === EventStatus.ONGOING) {
						upcomingToOngoing++;
						// Cancel EVENT_START job, schedule EVENT_END if needed
						await this.agendaService.cancelEventJobs(eventId);
						if (event.eventEndAt > now) {
							await this.agendaService.scheduleEventEnd(eventId, event.eventEndAt);
						}
						this.logger.debug(
							`Event ${eventId}: ${oldStatus} -> ${correctStatus} (started at ${event.eventStartAt.toISOString()})`,
						);
					} else if (correctStatus === EventStatus.COMPLETED) {
						upcomingToCompleted++;
						// Cancel all jobs since event is completed
						await this.agendaService.cancelEventJobs(eventId);
						this.logger.debug(
							`Event ${eventId}: ${oldStatus} -> ${correctStatus} (ended at ${event.eventEndAt.toISOString()})`,
						);
					}
				}
			}

			// Find events that are ONGOING but should be COMPLETED
			const ongoingEvents = await this.eventModel
				.find({
					eventStatus: EventStatus.ONGOING,
					eventEndAt: { $lt: now }, // Ended
				})
				.exec();

			for (const event of ongoingEvents) {
				const eventId = (event._id as unknown as { toString(): string }).toString();
				const correctStatus = determineStatus(event.eventStartAt, event.eventEndAt);
				if (correctStatus !== event.eventStatus) {
					const oldStatus = event.eventStatus;
					event.eventStatus = correctStatus;
					await event.save();

					ongoingToCompleted++;
					// Cancel all jobs since event is completed
					await this.agendaService.cancelEventJobs(eventId);
					this.logger.debug(
						`Event ${eventId}: ${oldStatus} -> ${correctStatus} (ended at ${event.eventEndAt.toISOString()})`,
					);
				}
			}

			const total = upcomingToOngoing + ongoingToCompleted + upcomingToCompleted;

			this.logger.log(
				`Event status cleanup completed: ${upcomingToOngoing} UPCOMING->ONGOING, ${ongoingToCompleted} ONGOING->COMPLETED, ${upcomingToCompleted} UPCOMING->COMPLETED (total: ${total})`,
			);

			return {
				upcomingToOngoing,
				ongoingToCompleted,
				upcomingToCompleted,
				total,
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			const errorStack = error instanceof Error ? error.stack : undefined;
			this.logger.error(`Error during event status cleanup: ${errorMessage}`, errorStack);
			throw error;
		}
	}
}
