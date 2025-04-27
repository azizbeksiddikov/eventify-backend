import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { Direction, Message } from '../../libs/enums/common.enum';
import { Group, Groups } from '../../libs/dto/group/group';
import { GroupInput, GroupsInquiry } from '../../libs/dto/group/group.input';
import { GroupUpdateInput } from '../../libs/dto/group/group.update';
import { StatisticModifier, T } from '../../libs/types/common';
import { Member } from '../../libs/dto/member/member';
import { GroupMember } from '../../libs/dto/groupMembers/groupMember';
import { GroupMemberInput } from '../../libs/dto/groupMembers/groupMember.input';
import { GroupMemberRole } from '../../libs/enums/group.enum';
import { GroupMemberUpdateInput } from '../../libs/dto/groupMembers/groupMember.update';
import { Event } from '../../libs/dto/event/event';
import { Ticket } from '../../libs/dto/ticket/ticket';
import { TicketInput } from '../../libs/dto/ticket/ticket.input';
import { EventStatus } from '../../libs/enums/event.enum';
import { TicketStatus } from '../../libs/enums/ticket.enum';

@Injectable()
export class TicketService {
	constructor(
		@InjectModel('Ticket') private readonly ticketModel: Model<Ticket>,
		@InjectModel('Member') private readonly memberModel: Model<Member>,
		@InjectModel('Event') private readonly eventModel: Model<Event>,
	) {}

	public async checkTicketExist(eventId: ObjectId, memberId: ObjectId): Promise<Ticket> {
		const ticket = await this.ticketModel
			.findOne({
				eventId: eventId,
				memberId: memberId,
			})
			.exec();

		return ticket;
	}

	public async createTicket(ticket: TicketInput): Promise<Ticket> {
		const { eventId, memberId, ticketPrice } = ticket;
		let newTicket;

		if (ticket.ticketStatus === TicketStatus.CANCELLED) {
			newTicket = await this.ticketModel.findOneAndUpdate(
				{ eventId: eventId, memberId: memberId },
				{ ticketStatus: TicketStatus.PURCHASED },
				{ new: true },
			);
		} else {
			newTicket = await this.ticketModel.create({ ...ticket, ticketStatus: TicketStatus.PURCHASED });
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
