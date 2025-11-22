import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Agenda } from 'agenda';

// ===== DTOs =====
import { Event } from '@app/api/src/libs/dto/event/event';

// ===== Enums =====
import { EventStatus } from '@app/api/src/libs/enums/event.enum';

@Injectable()
export class AgendaService implements OnModuleInit, OnModuleDestroy {
	private readonly logger = new Logger(AgendaService.name);
	private agenda: Agenda;

	constructor(@InjectModel('Event') private readonly eventModel: Model<Event>) {
		const mongoUri = process.env.NODE_ENV === 'production' ? process.env.MONGO_PROD : process.env.MONGO_DEV;

		this.agenda = new Agenda({
			db: { address: mongoUri },
		});

		this.logger.log('AgendaJS initialized for job processing');
	}

	async onModuleInit() {
		await this.initializeProcessors();
		await this.startProcessing();
	}

	async onModuleDestroy() {
		await this.agenda.stop();
		this.logger.log('AgendaJS stopped');
	}

	private async initializeProcessors(): Promise<void> {
		// Define event-start processor
		this.agenda.define('event-start', async (job) => {
			const { eventId } = job.attrs.data;
			this.logger.log(`Processing event-start job for event ${eventId}`);

			try {
				const event = await this.eventModel.findById(eventId).exec();
				if (!event) {
					this.logger.warn(`Event ${eventId} not found for event-start job`);
					return;
				}

				if (event.eventStatus === EventStatus.UPCOMING) {
					await this.eventModel.findByIdAndUpdate(eventId, { eventStatus: EventStatus.ONGOING }).exec();
					this.logger.log(`Event ${eventId} status changed to ONGOING`);
				} else {
					this.logger.warn(
						`Event ${eventId} status is ${event.eventStatus}, expected UPCOMING. Skipping status change.`,
					);
				}
			} catch (error) {
				this.logger.error(`Error processing event-start job for event ${eventId}:`, error);
			}
		});

		// Define event-end processor
		this.agenda.define('event-end', async (job) => {
			const { eventId } = job.attrs.data;
			this.logger.log(`Processing event-end job for event ${eventId}`);

			try {
				const event = await this.eventModel.findById(eventId).exec();
				if (!event) {
					this.logger.warn(`Event ${eventId} not found for event-end job`);
					return;
				}

				if (event.eventStatus === EventStatus.ONGOING) {
					await this.eventModel.findByIdAndUpdate(eventId, { eventStatus: EventStatus.COMPLETED }).exec();
					this.logger.log(`Event ${eventId} status changed to COMPLETED`);
				} else {
					this.logger.warn(
						`Event ${eventId} status is ${event.eventStatus}, expected ONGOING. Skipping status change.`,
					);
				}
			} catch (error) {
				this.logger.error(`Error processing event-end job for event ${eventId}:`, error);
			}
		});

		this.logger.log('AgendaJS processors initialized');
	}

	private async startProcessing(): Promise<void> {
		await this.agenda.start();
		this.logger.log('AgendaJS job processing started');
	}
}
