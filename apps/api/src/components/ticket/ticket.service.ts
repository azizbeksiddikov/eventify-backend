import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';

// ===== Enums =====
import { EventStatus } from '../../libs/enums/event.enum';
import { TicketStatus } from '../../libs/enums/ticket.enum';

// ===== DTOs =====
import { Event } from '../../libs/dto/event/event';
import { Ticket, Tickets } from '../../libs/dto/ticket/ticket';
import { TicketInput, TicketInquiry } from '../../libs/dto/ticket/ticket.input';

// ===== Types =====
import { Direction, Message } from '../../libs/enums/common.enum';
import { T } from '../../libs/types/common';
import { shapeIntoMongoObjectId, shapeObjectIdToString } from '../../libs/config';
import { NotificationInput } from '../../libs/dto/notification/notification.input';
import { NotificationType } from '../../libs/enums/notification.enum';

// ===== Services =====
import { NotificationService } from '../notification/notification.service';
import { MemberService } from '../member/member.service';
import { EventService } from '../event/event.service';
import { CurrencyService } from '../currency/currency.service';
import { logger } from '../../libs/logger';

@Injectable()
export class TicketService {
	constructor(
		@InjectModel('Ticket') private readonly ticketModel: Model<Ticket>,
		private readonly notificationService: NotificationService,
		private readonly memberService: MemberService,
		private readonly eventService: EventService,
		private readonly currencyService: CurrencyService,
	) {}

	public async createTicket(memberId: ObjectId, ticket: TicketInput): Promise<Ticket> {
		const { eventId, ticketQuantity } = ticket;

		// Check for valid ticket quantity
		if (ticketQuantity < 1) throw new BadRequestException(Message.TICKET_QUANTITY_INVALID);

		// Check for event existence
		const event: Event = await this.eventService.getSimpleEvent(eventId);
		if (!event) throw new NotFoundException(Message.EVENT_NOT_FOUND);

		// Check if the event is full
		if (event.eventCapacity && event.attendeeCount + ticketQuantity > event.eventCapacity)
			throw new BadRequestException(Message.EVENT_FULL);

		// Check if the member has enough points
		if (!event.eventCurrency) throw new BadRequestException('Event currency is not defined');
		const rate = await this.currencyService.getCurrencyRate(event.eventCurrency);
		const requiredPoints = event.eventPrice * ticketQuantity * rate;
		const memberPoints = await this.memberService.getMemberPoints(memberId);
		if (memberPoints < requiredPoints) {
			throw new BadRequestException(Message.INSUFFICIENT_POINTS);
		}

		// Create a new ticket
		try {
			const newTicketInput: T = {
				eventId: eventId,
				memberId: memberId,
				ticketStatus: TicketStatus.PURCHASED,
				ticketPrice: event.eventPrice,
				ticketCurrency: event.eventCurrency,
				ticketQuantity: ticketQuantity,
				totalPrice: requiredPoints, // Store the calculated points as totalPrice
			};
			const newTicket: Ticket = (await this.ticketModel.create(newTicketInput)) as Ticket;

			// create notification for event organizer
			if (event.memberId) {
				const eventIdStr = shapeObjectIdToString(eventId);
				const notificationLink = `/events/${eventIdStr}`;
				const newNotification: NotificationInput = {
					memberId: memberId,
					receiverId: event.memberId,
					notificationType: NotificationType.JOIN_EVENT,
					notificationLink: notificationLink,
				};
				await this.notificationService.createNotification(newNotification);
			}

			// update member stats
			await this.memberService.memberStatsEditor({ _id: memberId, targetKey: 'memberEvents', modifier: 1 });
			await this.memberService.memberStatsEditor({
				_id: memberId,
				targetKey: 'memberPoints',
				modifier: -requiredPoints,
			});

			// update event stats
			newTicket.event = await this.eventService.eventStatsEditor({
				_id: eventId,
				targetKey: 'attendeeCount',
				modifier: ticketQuantity,
			});

			return newTicket;
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Unknown error';
			logger.error('TicketService', 'ERROR: Service.model', err instanceof Error ? err : new Error(errorMessage));
			throw new BadRequestException(Message.CREATE_FAILED);
		}
	}

	public async cancelTicket(memberId: ObjectId, ticketId: ObjectId): Promise<Ticket> {
		// find a ticket
		const ticket = (await this.ticketModel
			.findOneAndUpdate({ _id: ticketId, memberId: memberId }, { ticketStatus: TicketStatus.CANCELLED }, { new: true })
			.lean()
			.exec()) as Ticket;
		if (!ticket) throw new Error(Message.TICKET_NOT_FOUND);

		// change members's points
		await this.memberService.memberStatsEditor({
			_id: memberId,
			targetKey: 'memberPoints',
			modifier: ticket.totalPrice,
		});

		// change event's attendee Count
		ticket.event = await this.eventService.eventStatsEditor({
			_id: ticket.eventId,
			targetKey: 'attendeeCount',
			modifier: -ticket.ticketQuantity,
		});

		return ticket;
	}

	public async getAllTicketsList(memberId: ObjectId): Promise<Ticket[]> {
		const match: T = { memberId: memberId };

		const result = await this.ticketModel
			.aggregate<Ticket>([
				{ $match: match },
				{ $sort: { createdAt: Direction.DESC } },
				{ $lookup: { from: 'events', localField: 'eventId', foreignField: '_id', as: 'event' } },
				{ $unwind: '$event' },
			])
			.exec();

		if (!result.length) throw new BadRequestException(Message.NO_DATA_FOUND);
		return result;
	}

	public async getMyTickets(memberId: ObjectId, input: TicketInquiry): Promise<Tickets> {
		const match: T = { memberId: memberId };
		if (input.search.eventId) {
			const eventIdObj = shapeIntoMongoObjectId(input.search.eventId);
			match.eventId = eventIdObj;
			const event: Event = await this.eventService.getSimpleEvent(eventIdObj);
			if (!event) throw new NotFoundException(Message.EVENT_NOT_FOUND);
		}
		if (input.search.ticketStatus) {
			match.ticketStatus = input.search.ticketStatus;
		}
		const sort = { [input?.sort || 'createdAt']: input?.direction || Direction.DESC };

		const result = await this.ticketModel.aggregate<Tickets>([
			{ $match: match },
			{ $sort: sort },
			{
				$facet: {
					list: [
						{ $skip: (input.page - 1) * input.limit },
						{ $limit: input.limit },
						{ $lookup: { from: 'events', localField: 'eventId', foreignField: '_id', as: 'event' } },
						{ $unwind: '$event' },
					],
					metaCounter: [{ $count: 'total' }],
				},
			},
		]);
		return result[0];
	}

	// ============== Ticket Query Methods ==============
	public async getEventsByTickets(memberId: ObjectId, eventStatus: EventStatus[]): Promise<Event[]> {
		const result = await this.ticketModel
			.aggregate<Event>([
				{ $match: { memberId: memberId } },
				{
					$lookup: {
						from: 'events',
						localField: 'eventId',
						foreignField: '_id',
						as: 'event',
					},
				},
				{ $unwind: '$event' },
				{ $match: { 'event.eventStatus': { $in: eventStatus } } },
				{ $replaceRoot: { newRoot: '$event' } },
			])
			.exec();

		return result;
	}
}
