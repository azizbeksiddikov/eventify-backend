import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';

// ===== Enums =====
import { EventStatus } from '../../libs/enums/event.enum';
import { TicketStatus } from '../../libs/enums/ticket.enum';

// ===== DTOs =====
import { Event } from '../../libs/dto/event/event';
import { Ticket } from '../../libs/dto/ticket/ticket';
import { TicketInput } from '../../libs/dto/ticket/ticket.input';

// ===== Types =====
import { Member } from '../../libs/dto/member/member';
import { Message } from '../../libs/enums/common.enum';

@Injectable()
export class TicketService {
	constructor(
		@InjectModel('Ticket') private readonly ticketModel: Model<Ticket>,
		@InjectModel('Member') private readonly memberModel: Model<Member>,
		@InjectModel('Event') private readonly eventModel: Model<Event>,
	) {}

	public async createTicket(memberId: ObjectId, ticket: TicketInput): Promise<Ticket> {
		const { eventId, totalPrice } = ticket;

		// Check if the event is in the group
		const event = await this.eventModel.findById(eventId).exec();
		if (!event) {
			throw new BadRequestException(Message.EVENT_NOT_FOUND);
		}

		// Check if the member has enough points
		const member = await this.memberModel.findById(memberId).exec();
		if (member.memberPoints < totalPrice) {
			throw new BadRequestException(Message.INSUFFICIENT_POINTS);
		}

		const newTicket = await this.ticketModel.create({
			...ticket,
			memberId: memberId,
			ticketStatus: TicketStatus.PURCHASED,
		});

		await this.memberModel.findByIdAndUpdate(memberId, { $inc: { memberPoints: -totalPrice } }).exec();

		newTicket.event = await this.eventModel
			.findByIdAndUpdate(eventId, { $inc: { attendeeCount: newTicket.ticketQuantity } }, { new: true })
			.lean()
			.exec();

		return newTicket;
	}

	public async cancelTicket(memberId: ObjectId, ticketId: ObjectId): Promise<Ticket> {
		const ticket = await this.ticketModel
			.findOneAndUpdate({ _id: ticketId, memberId: memberId }, { ticketStatus: TicketStatus.CANCELLED }, { new: true })
			.lean()
			.exec();

		await this.memberModel.findByIdAndUpdate(memberId, { $inc: { memberPoints: ticket.totalPrice } }).exec();

		ticket.event = await this.eventModel
			.findByIdAndUpdate(ticket.eventId, { $inc: { attendeeCount: -ticket.ticketQuantity } }, { new: true })
			.lean()
			.exec();

		return ticket;
	}

	// ============== Ticket Query Methods ==============
	public async getEventsByTickets(memberId: ObjectId, eventStatus: EventStatus[]): Promise<Event[]> {
		const result = await this.ticketModel
			.aggregate([
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
