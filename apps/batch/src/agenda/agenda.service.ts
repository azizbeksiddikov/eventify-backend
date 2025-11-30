import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Agenda } from 'agenda';

// ===== DTOs =====
import { Event } from '@app/api/src/libs/dto/event/event';

// ===== Enums =====
import { EventStatus, EventJobStatus } from '@app/api/src/libs/enums/event.enum';

@Injectable()
export class AgendaService implements OnModuleInit, OnModuleDestroy {
	private readonly logger = new Logger(AgendaService.name);
	private agenda: Agenda;

	constructor(@InjectModel('Event') private readonly eventModel: Model<Event>) {
		const mongoUri = process.env.NODE_ENV === 'production' ? process.env.MONGO_PROD : process.env.MONGO_DEV;
		if (!mongoUri) throw new Error('No mongoDB uri');
		this.agenda = new Agenda({
			db: { address: mongoUri },
		});

		this.logger.log('AgendaJS initialized for job processing');
	}

	getAgenda(): Agenda {
		return this.agenda;
	}

	async onModuleInit() {
		await this.initializeProcessors();
		await this.startProcessing();
	}

	async onModuleDestroy() {
		try {
			await this.agenda.stop();
			await this.agenda.close();
			this.logger.log('AgendaJS stopped');
		} catch (error) {
			this.logger.error('Error stopping AgendaJS:', error);
		}
	}

	private async initializeProcessors(): Promise<void> {
		// Define event-start processor
		this.agenda.define(EventJobStatus.EVENT_START, async (job) => {
			const { eventId } = job.attrs.data;
			this.logger.log(`Processing ${EventJobStatus.EVENT_START} job for event ${eventId}`);

			try {
				const event = await this.eventModel.findById(eventId).exec();
				if (!event) {
					this.logger.warn(`Event ${eventId} not found for ${EventJobStatus.EVENT_START} job`);
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
				this.logger.error(`Error processing ${EventJobStatus.EVENT_START} job for event ${eventId}:`, error);
			}
		});

		// Define event-end processor
		this.agenda.define(EventJobStatus.EVENT_END, async (job) => {
			const { eventId } = job.attrs.data;
			this.logger.log(`Processing ${EventJobStatus.EVENT_END} job for event ${eventId}`);

			try {
				const event = await this.eventModel.findById(eventId).exec();
				if (!event) {
					this.logger.warn(`Event ${eventId} not found for ${EventJobStatus.EVENT_END} job`);
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
				this.logger.error(`Error processing ${EventJobStatus.EVENT_END} job for event ${eventId}:`, error);
			}
		});

		this.logger.log('AgendaJS processors initialized');
	}

	private async startProcessing(): Promise<void> {
		await this.agenda.start();
		this.logger.log('AgendaJS job processing started');
	}
}
