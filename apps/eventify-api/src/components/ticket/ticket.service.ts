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

@Injectable()
export class TicketService {
	constructor(
		@InjectModel('Ticket') private readonly ticketModel: Model<Ticket>,
		@InjectModel('Member') private readonly memberModel: Model<Member>,
		@InjectModel('Event') private readonly eventModel: Model<Event>,
	) {}

	// ============== Ticket Management Methods ==============
	public async checkTicketExist(eventId: ObjectId, memberId: ObjectId): Promise<Ticket> {
		const ticket = await this.ticketModel
			.findOne({
				eventId: eventId,
				memberId: memberId,
			})
			.exec();

		return ticket;
	}

	public async createTicket(memberId: ObjectId, ticket: TicketInput): Promise<Ticket> {
		const { eventId, ticketPrice } = ticket;
		let newTicket;

		if (ticket.ticketStatus === TicketStatus.CANCELLED) {
			newTicket = await this.ticketModel.findOneAndUpdate(
				{ eventId: eventId, memberId: memberId },
				{ ticketStatus: TicketStatus.CANCELLED },
				{ new: true },
			);
		} else {
			newTicket = await this.ticketModel.create({ ...ticket, memberId: memberId });
		}

		await this.memberModel.findByIdAndUpdate(memberId, { $inc: { memberPoints: -ticketPrice } }).exec();

		newTicket.event = await this.eventModel
			.findByIdAndUpdate(eventId, { $inc: { attendeeCount: 1 } }, { new: true })
			.lean()
			.exec();

		return newTicket;
	}

	public async cancelTicket(eventId: ObjectId, memberId: ObjectId): Promise<Ticket> {
		const ticket = await this.ticketModel
			.findOneAndUpdate(
				{ eventId: eventId, memberId: memberId },
				{ ticketStatus: TicketStatus.CANCELLED },
				{ new: true },
			)
			.exec();
		await this.memberModel.findByIdAndUpdate(memberId, { $inc: { memberPoints: ticket.ticketPrice } }).exec();
		ticket.event = await this.eventModel
			.findByIdAndUpdate(eventId, { $inc: { attendeeCount: -1 } }, { new: true })
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
