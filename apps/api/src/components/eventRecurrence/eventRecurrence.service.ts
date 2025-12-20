import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';

// ===== Enums =====
import { Message } from '../../libs/enums/common.enum';
import { EventStatus, EventType, RecurrenceType } from '../../libs/enums/event.enum';

// ===== Types & DTOs =====
import { EventRecurrence } from '../../libs/dto/eventRecurrence/eventRecurrence';
import { EventRecurrenceInput, EventRecurrenceUpdateInput } from '../../libs/dto/eventRecurrence/eventRecurrence.input';
import { Event } from '../../libs/dto/event/event';

// ===== Services =====
import { AgendaService } from '../agenda/agenda.service';
import { MemberService } from '../member/member.service';
import { GroupService } from '../group/group.service';
import { EventInput } from '../../libs/dto/event/event.input';

@Injectable()
export class EventRecurrenceService {
	private readonly logger = new Logger(EventRecurrenceService.name);

	constructor(
		@InjectModel('EventRecurrence') private readonly eventRecurrenceModel: Model<EventRecurrence>,
		@InjectModel('Event') private readonly eventModel: Model<Event>,
		private readonly agendaService: AgendaService,
		private readonly memberService: MemberService,
		private readonly groupService: GroupService,
	) {}

	// ============== Main Methods ==============
	public async createRecurringEvent(memberId: ObjectId, input: EventRecurrenceInput): Promise<EventRecurrence> {
		// Validation: Ensure no past event start date
		if (new Date(input.eventStartAt) < new Date()) {
			throw new BadRequestException('Cannot create recurring events starting in the past');
		}

		// Validate single-day constraint
		const duration = new Date(input.eventEndAt).getTime() - new Date(input.eventStartAt).getTime(); // duration in milliseconds
		const dayInMs = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
		if (duration > dayInMs) {
			throw new BadRequestException('Recurring events must be single-day events (duration <= 24 hours)');
		}

		// Validate recurrence fields
		this.validateRecurrenceFields(input);

		// Check group if provided
		if (input.groupId) {
			await this.groupService.getSimpleGroup(input.groupId);
			const groupAdmin = await this.groupService.isAuthorized(memberId, input.groupId);
			if (!groupAdmin) throw new BadRequestException(Message.NOT_GROUP_ADMIN);
		}

		try {
			// Create EventRecurrence template
			const recurrence = await this.eventRecurrenceModel.create({
				...input,
				memberId: memberId,
				eventStatus: EventStatus.UPCOMING,
				isActive: true,
			});

			// Generate events for next 30 days
			await this.generateEvents(recurrence);

			return recurrence;
		} catch (error) {
			this.logger.error(`Failed to create recurring event: ${error.message}`);
			throw new BadRequestException(Message.CREATE_FAILED);
		}
	}

	public async updateRecurringEvent(memberId: ObjectId, input: EventRecurrenceUpdateInput): Promise<EventRecurrence> {
		const recurrence = await this.eventRecurrenceModel.findById(input._id).exec();
		if (!recurrence || !recurrence.isActive) {
			throw new BadRequestException('Event recurrence not found');
		}

		// Check authorization
		if (recurrence.memberId.toString() !== memberId.toString()) {
			throw new BadRequestException(Message.NOT_AUTHORIZED);
		}

		// Validate recurrence fields if changed
		if (input.recurrenceType) {
			this.validateRecurrenceFields(input as any);
		}

		// If status is CANCELLED or DELETED, set isActive to false
		if (input.eventStatus === EventStatus.CANCELLED || input.eventStatus === EventStatus.DELETED) {
			input.isActive = false;
			input.recurrenceEndDate = input.eventEndAt || new Date();
		}

		// Update EventRecurrence template
		const updatedRecurrence = (await this.eventRecurrenceModel
			.findByIdAndUpdate(input._id, input, { new: true })
			.exec()) as EventRecurrence;

		// If updateAllFuture is true, update all future events
		if (input.updateAllFuture) {
			await this.updateAllFutureEvents(updatedRecurrence);
		}

		// If recurrenceEndDate changed, delete events beyond it
		if (input.recurrenceEndDate) {
			await this.deleteEventsBeyondEndDate(input._id, input.recurrenceEndDate);
		}

		return updatedRecurrence;
	}

	public async cancelRecurringSeries(memberId: ObjectId, recurrenceId: ObjectId): Promise<EventRecurrence> {
		const recurrence = await this.eventRecurrenceModel.findById(recurrenceId).exec();
		if (!recurrence || !recurrence.isActive) {
			throw new BadRequestException('Event recurrence not found');
		}

		// Check authorization
		if (recurrence.memberId.toString() !== memberId.toString()) {
			throw new BadRequestException(Message.NOT_AUTHORIZED);
		}

		// Mark as inactive
		recurrence.isActive = false;
		recurrence.recurrenceEndDate = new Date();
		await recurrence.save();

		// Cancel all future events
		const futureEvents = await this.eventModel
			.find({
				recurrenceId: recurrenceId,
				eventStartAt: { $gte: new Date() },
				eventStatus: { $in: [EventStatus.UPCOMING, EventStatus.ONGOING] },
			})
			.exec();

		for (const event of futureEvents) {
			event.eventStatus = EventStatus.CANCELLED;
			await event.save();
			await this.agendaService.cancelEventJobs(event._id);
		}

		return recurrence;
	}

	public async getRecurrence(recurrenceId: ObjectId): Promise<EventRecurrence> {
		const recurrence = await this.eventRecurrenceModel.findById(recurrenceId).exec();
		if (!recurrence) {
			throw new BadRequestException('Event recurrence not found');
		}
		return recurrence;
	}

	// ============== Event Generation Logic ==============
	public async generateEvents(recurrence: EventRecurrence): Promise<void> {
		const today = new Date();
		const endDate = new Date(today);
		endDate.setDate(endDate.getDate() + 30);

		const occurrences = this.calculateOccurrences(recurrence, today, endDate);

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
				const eventInput: EventInput = {
					eventType: EventType.RECURRING,
					recurrenceId: recurrence._id,
					eventName: recurrence.eventName,
					eventDesc: recurrence.eventDesc,
					eventImages: recurrence.eventImages,
					eventStartAt: occurrence.startAt,
					eventEndAt: occurrence.endAt,
					locationType: recurrence.locationType,
					eventCity: recurrence.eventCity,
					eventAddress: recurrence.eventAddress,
					coordinateLatitude: recurrence.coordinateLatitude,
					coordinateLongitude: recurrence.coordinateLongitude,
					eventCapacity: recurrence.eventCapacity,
					eventPrice: recurrence.eventPrice,
					eventCurrency: recurrence.eventCurrency,
					eventCategories: recurrence.eventCategories,
					eventTags: recurrence.eventTags || [],
					eventStatus: EventStatus.UPCOMING,
					groupId: recurrence.groupId,
					memberId: recurrence.memberId,
					origin: recurrence.origin,
					isRealEvent: recurrence.isRealEvent,
					attendeeCount: 0,
				};
				const event = await this.eventModel.create(eventInput);

				await this.memberService.memberStatsEditor({
					_id: recurrence.memberId,
					targetKey: 'eventsOrganizedCount',
					modifier: 1,
				});

				if (recurrence.groupId) {
					await this.groupService.groupStatsEditor({
						_id: recurrence.groupId,
						targetKey: 'eventsCount',
						modifier: 1,
					});
				}

				// Schedule AgendaJS jobs
				if (event.eventStartAt > new Date() && event.eventEndAt > new Date()) {
					await this.agendaService.scheduleEventStart(event._id, event.eventStartAt);
					await this.agendaService.scheduleEventEnd(event._id, event.eventEndAt);
				}
			}
		}

		this.logger.log(`Generated ${occurrences.length} events for recurrence ${recurrence._id}`);
	}

	public async generateEventsForAllActive(): Promise<void> {
		const activeRecurrences = await this.eventRecurrenceModel.find({ isActive: true }).exec();

		for (const recurrence of activeRecurrences) {
			// Skip if recurrenceEndDate is in the past
			if (recurrence.recurrenceEndDate && recurrence.recurrenceEndDate < new Date()) {
				continue;
			}

			// Find latest generated event
			const latestEvent = await this.eventModel
				.findOne({ recurrenceId: recurrence._id })
				.sort({ eventStartAt: -1 })
				.exec();

			const today = new Date();
			const endDate = new Date(today);
			endDate.setDate(endDate.getDate() + 30);

			// Check if we need to generate more events
			if (!latestEvent || latestEvent.eventStartAt < endDate) {
				await this.generateEvents(recurrence);
			}
		}

		this.logger.log('Completed daily event generation for all active recurrences');
	}

	// ============== Helper Methods ==============
	private calculateOccurrences(
		recurrence: EventRecurrence,
		startDate: Date,
		endDate: Date,
	): { startAt: Date; endAt: Date }[] {
		const occurrences: { startAt: Date; endAt: Date }[] = [];
		const duration = new Date(recurrence.eventEndAt).getTime() - new Date(recurrence.eventStartAt).getTime();

		let currentDate = new Date(recurrence.eventStartAt);
		if (currentDate < startDate) {
			currentDate = new Date(startDate);
		}

		const maxDate = recurrence.recurrenceEndDate
			? new Date(Math.min(endDate.getTime(), recurrence.recurrenceEndDate.getTime()))
			: endDate;

		switch (recurrence.recurrenceType) {
			case RecurrenceType.INTERVAL:
				occurrences.push(...this.calculateIntervalOccurrences(recurrence, currentDate, maxDate, duration));
				break;
			case RecurrenceType.DAYS_OF_WEEK:
				occurrences.push(...this.calculateWeeklyOccurrences(recurrence, currentDate, maxDate, duration));
				break;
			case RecurrenceType.DAY_OF_MONTH:
				occurrences.push(...this.calculateMonthlyOccurrences(recurrence, currentDate, maxDate, duration));
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
		if (!recurrence.recurrenceInterval) {
			throw new BadRequestException('recurrenceInterval is required for INTERVAL type and must be >= 1');
		}
		const occurrences: { startAt: Date; endAt: Date }[] = [];
		let currentDate = new Date(recurrence.eventStartAt);

		while (currentDate <= endDate) {
			if (currentDate >= startDate) {
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
		if (!recurrence.recurrenceDaysOfWeek) {
			throw new BadRequestException('recurrenceDaysOfWeek is required for DAYS_OF_WEEK type');
		}
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
		if (!recurrence.recurrenceDayOfMonth) {
			throw new BadRequestException('recurrenceDayOfMonth is required for DAY_OF_MONTH type and must be >= 1');
		}
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

	private validateRecurrenceFields(input: EventRecurrenceInput | EventRecurrenceUpdateInput): void {
		switch (input.recurrenceType) {
			case RecurrenceType.INTERVAL:
				if (!input.recurrenceInterval || input.recurrenceInterval < 1) {
					throw new BadRequestException('recurrenceInterval is required for INTERVAL type and must be >= 1');
				}
				break;
			case RecurrenceType.DAYS_OF_WEEK:
				if (!input.recurrenceDaysOfWeek || input.recurrenceDaysOfWeek.length === 0) {
					throw new BadRequestException('recurrenceDaysOfWeek is required for DAYS_OF_WEEK type');
				}
				break;
			case RecurrenceType.DAY_OF_MONTH:
				if (!input.recurrenceDayOfMonth || input.recurrenceDayOfMonth < 1 || input.recurrenceDayOfMonth > 31) {
					throw new BadRequestException(
						'recurrenceDayOfMonth is required for DAY_OF_MONTH type and must be between 1-31',
					);
				}
				break;
		}

		// Validate recurrence end date
		if (
			input.recurrenceEndDate &&
			input.eventStartAt &&
			new Date(input.recurrenceEndDate) < new Date(input.eventStartAt)
		) {
			throw new BadRequestException('recurrenceEndDate must be after eventStartAt');
		}
	}

	private async updateAllFutureEvents(recurrence: EventRecurrence): Promise<void> {
		const futureEvents = await this.eventModel
			.find({
				recurrenceId: recurrence._id,
				eventStartAt: { $gte: new Date() },
				eventStatus: { $in: [EventStatus.UPCOMING, EventStatus.ONGOING] },
			})
			.exec();

		for (const event of futureEvents) {
			// Cancel existing jobs
			await this.agendaService.cancelEventJobs(event._id);

			// Update event with template values
			event.eventName = recurrence.eventName;
			event.eventDesc = recurrence.eventDesc;
			event.eventImages = recurrence.eventImages;
			event.locationType = recurrence.locationType;
			event.eventAddress = recurrence.eventAddress;
			event.eventCity = recurrence.eventCity;
			event.coordinateLatitude = recurrence.coordinateLatitude;
			event.coordinateLongitude = recurrence.coordinateLongitude;
			event.eventCapacity = recurrence.eventCapacity;
			event.eventPrice = recurrence.eventPrice;
			event.eventCurrency = recurrence.eventCurrency;
			event.eventCategories = recurrence.eventCategories;
			event.eventTags = recurrence.eventTags || [];
			event.eventStatus = recurrence.eventStatus;

			await event.save();

			// Reschedule jobs
			if (event.eventStatus === EventStatus.UPCOMING && event.eventStartAt > new Date()) {
				await this.agendaService.scheduleEventStart(event._id, event.eventStartAt);
				await this.agendaService.scheduleEventEnd(event._id, event.eventEndAt);
			}
		}

		this.logger.log(`Updated ${futureEvents.length} future events for recurrence ${recurrence._id}`);
	}

	private async deleteEventsBeyondEndDate(recurrenceId: ObjectId, endDate: Date): Promise<void> {
		const eventsToDelete = await this.eventModel
			.find({
				recurrenceId: recurrenceId,
				eventStartAt: { $gt: endDate },
			})
			.exec();

		for (const event of eventsToDelete) {
			await this.agendaService.cancelEventJobs(event._id);
			await this.eventModel.findByIdAndDelete(event._id).exec();
		}

		this.logger.log(`Deleted ${eventsToDelete.length} events beyond end date for recurrence ${recurrenceId}`);
	}
}
