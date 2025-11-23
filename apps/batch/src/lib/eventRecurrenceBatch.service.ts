import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Agenda } from 'agenda';

// ===== DTOs =====
import { EventRecurrence } from '@app/api/src/libs/dto/eventRecurrence/eventRecurrence';
import { Event } from '@app/api/src/libs/dto/event/event';

// ===== Enums =====
import { EventStatus, EventType, RecurrenceType } from '@app/api/src/libs/enums/event.enum';

@Injectable()
export class EventRecurrenceBatchService {
	private readonly logger = new Logger(EventRecurrenceBatchService.name);
	private agenda: Agenda;

	constructor(
		@InjectModel('EventRecurrence') private readonly eventRecurrenceModel: Model<EventRecurrence>,
		@InjectModel('Event') private readonly eventModel: Model<Event>,
	) {
		const mongoUri = process.env.NODE_ENV === 'production' ? process.env.MONGO_PROD : process.env.MONGO_DEV;
		if (!mongoUri) throw new Error('No DB key configured');
		this.agenda = new Agenda({
			db: { address: mongoUri },
		});
	}

	@Cron('0 2 * * *') // Every day at 02:00 AM
	async generateRecurringEvents() {
		this.logger.log('Starting daily event generation for recurring events...');

		try {
			const activeRecurrences = await this.eventRecurrenceModel.find({ isActive: true }).exec();
			this.logger.log(`Found ${activeRecurrences.length} active event recurrences`);

			for (const recurrence of activeRecurrences) {
				// Skip if recurrenceEndDate is in the past
				if (recurrence.recurrenceEndDate && recurrence.recurrenceEndDate < new Date()) {
					this.logger.log(`Skipping recurrence ${recurrence._id} - end date in the past`);
					continue;
				}

				// Find latest generated event
				const latestEvent = await this.eventModel
					.findOne({ recurrenceId: recurrence._id })
					.sort({ eventStartAt: -1 })
					.exec();

				const today = new Date();
				const targetDate = new Date(today);
				targetDate.setDate(targetDate.getDate() + 30);

				// Check if we need to generate more events
				if (!latestEvent || latestEvent.eventStartAt < targetDate) {
					const startDate = latestEvent ? new Date(latestEvent.eventStartAt) : new Date(recurrence.eventStartAt);
					startDate.setDate(startDate.getDate() + 1); // Start from next day after latest

					await this.generateEvents(recurrence, startDate, targetDate);
				}
			}

			this.logger.log('Completed daily event generation for recurring events');
		} catch (error) {
			this.logger.error(`Error during daily event generation: ${error.message}`, error.stack);
		}
	}

	private async generateEvents(recurrence: EventRecurrence, startDate: Date, endDate: Date): Promise<void> {
		const occurrences = this.calculateOccurrences(recurrence, startDate, endDate);
		let generatedCount = 0;

		for (const occurrence of occurrences) {
			// Check if event already exists
			const exists = await this.eventModel
				.findOne({
					recurrenceId: recurrence._id,
					eventStartAt: occurrence.startAt,
				})
				.exec();

			if (!exists) {
				// Create event
				const event = await this.eventModel.create({
					eventType: EventType.RECURRING,
					recurrenceId: recurrence._id,
					eventName: recurrence.eventName,
					eventDesc: recurrence.eventDesc,
					eventImages: recurrence.eventImages,
					eventStartAt: occurrence.startAt,
					eventEndAt: occurrence.endAt,
					eventAddress: recurrence.eventAddress,
					eventCity: recurrence.eventCity,
					eventCapacity: recurrence.eventCapacity,
					eventPrice: recurrence.eventPrice,
					eventCategories: recurrence.eventCategories,
					eventStatus: EventStatus.UPCOMING,
					groupId: recurrence.groupId,
					memberId: recurrence.memberId,
					origin: recurrence.origin,
					attendeeCount: 0,
					eventLikes: 0,
					eventViews: 0,
				});

				// Schedule AgendaJS jobs
				if (event.eventStartAt > new Date() && event.eventEndAt > new Date()) {
					try {
						await this.agenda.schedule(event.eventStartAt, 'event-start', { eventId: event._id.toString() });
						await this.agenda.schedule(event.eventEndAt, 'event-end', { eventId: event._id.toString() });
					} catch (error) {
						this.logger.error(`Failed to schedule jobs for event ${event._id}: ${error.message}`);
					}
				}

				generatedCount++;
			}
		}

		this.logger.log(`Generated ${generatedCount} new events for recurrence ${recurrence._id}`);
	}

	private calculateOccurrences(
		recurrence: EventRecurrence,
		startDate: Date,
		endDate: Date,
	): { startAt: Date; endAt: Date }[] {
		const occurrences: { startAt: Date; endAt: Date }[] = [];
		const duration = new Date(recurrence.eventEndAt).getTime() - new Date(recurrence.eventStartAt).getTime();

		const maxDate = recurrence.recurrenceEndDate
			? new Date(Math.min(endDate.getTime(), recurrence.recurrenceEndDate.getTime()))
			: endDate;

		switch (recurrence.recurrenceType) {
			case RecurrenceType.INTERVAL:
				occurrences.push(...this.calculateIntervalOccurrences(recurrence, startDate, maxDate, duration));
				break;
			case RecurrenceType.DAYS_OF_WEEK:
				occurrences.push(...this.calculateWeeklyOccurrences(recurrence, startDate, maxDate, duration));
				break;
			case RecurrenceType.DAY_OF_MONTH:
				occurrences.push(...this.calculateMonthlyOccurrences(recurrence, startDate, maxDate, duration));
				break;
		}

		return occurrences;
	}

	private calculateIntervalOccurrences(
		recurrence: EventRecurrence,
		startDate: Date,
		endDate: Date,
		duration: number,
	): { startAt: Date; endAt: Date }[] {
		if (!recurrence.recurrenceInterval) throw new Error('No recurrence.recurrenceInterval');
		const occurrences: { startAt: Date; endAt: Date }[] = [];
		let currentDate = new Date(startDate);
		currentDate.setHours(new Date(recurrence.eventStartAt).getHours());
		currentDate.setMinutes(new Date(recurrence.eventStartAt).getMinutes());

		while (currentDate <= endDate) {
			// Check if restricted to specific days of week
			if (!recurrence.recurrenceDaysOfWeek || recurrence.recurrenceDaysOfWeek.includes(currentDate.getDay())) {
				const eventStart = new Date(currentDate);
				const eventEnd = new Date(currentDate.getTime() + duration);
				occurrences.push({ startAt: eventStart, endAt: eventEnd });
			}
			currentDate.setDate(currentDate.getDate() + recurrence.recurrenceInterval);
		}

		return occurrences;
	}

	private calculateWeeklyOccurrences(
		recurrence: EventRecurrence,
		startDate: Date,
		endDate: Date,
		duration: number,
	): { startAt: Date; endAt: Date }[] {
		if (!recurrence.recurrenceDaysOfWeek) throw new Error('recurrence.recurrenceDaysOfWeek');
		const occurrences: { startAt: Date; endAt: Date }[] = [];
		let currentDate = new Date(startDate);
		currentDate.setHours(new Date(recurrence.eventStartAt).getHours());
		currentDate.setMinutes(new Date(recurrence.eventStartAt).getMinutes());

		while (currentDate <= endDate) {
			if (recurrence.recurrenceDaysOfWeek.includes(currentDate.getDay())) {
				const eventStart = new Date(currentDate);
				const eventEnd = new Date(currentDate.getTime() + duration);
				occurrences.push({ startAt: eventStart, endAt: eventEnd });
			}
			currentDate.setDate(currentDate.getDate() + 1);
		}

		return occurrences;
	}

	private calculateMonthlyOccurrences(
		recurrence: EventRecurrence,
		startDate: Date,
		endDate: Date,
		duration: number,
	): { startAt: Date; endAt: Date }[] {
		if (!recurrence.recurrenceDayOfMonth) throw new Error('No recurrence.recurrenceDayOfMonth');
		const occurrences: { startAt: Date; endAt: Date }[] = [];
		let currentDate = new Date(startDate);
		currentDate.setDate(1); // Start from first day of month

		while (currentDate <= endDate) {
			// Get the target day, handling month boundaries
			const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
			const targetDay = Math.min(recurrence.recurrenceDayOfMonth, daysInMonth);

			currentDate.setDate(targetDay);
			currentDate.setHours(new Date(recurrence.eventStartAt).getHours());
			currentDate.setMinutes(new Date(recurrence.eventStartAt).getMinutes());

			if (currentDate >= startDate && currentDate <= endDate) {
				const eventStart = new Date(currentDate);
				const eventEnd = new Date(currentDate.getTime() + duration);
				occurrences.push({ startAt: eventStart, endAt: eventEnd });
			}

			// Move to next month
			currentDate.setMonth(currentDate.getMonth() + 1);
			currentDate.setDate(1);
		}

		return occurrences;
	}
}
