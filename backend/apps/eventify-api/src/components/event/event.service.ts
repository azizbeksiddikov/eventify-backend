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
import { Event, Events } from '../../libs/dto/event/event';
import { EventInput, EventsInquiry, OrdinaryEventInquiry } from '../../libs/dto/event/event.input';
import { EventUpdateInput } from '../../libs/dto/event/event.update';
import { EventStatus } from '../../libs/enums/event.enum';
import { MemberType } from '../../libs/enums/member.enum';
import { Ticket } from '../../libs/dto/ticket/ticket';
import { TicketStatus } from '../../libs/enums/ticket.enum';
import { TicketInput } from '../../libs/dto/ticket/ticket.input';
import { TicketService } from '../ticket/ticket.service';
import { LikeService } from '../like/like.service';
import { ViewService } from '../view/view.service';

@Injectable()
export class EventService {
	constructor(
		@InjectModel('Event') private readonly eventModel: Model<Event>,
		@InjectModel('Ticket') private readonly ticketModel: Model<Ticket>,
		@InjectModel('Member') private readonly memberModel: Model<Member>,
		@InjectModel('GroupMember') private readonly groupMemberModel: Model<GroupMember>,
		private readonly ticketService: TicketService,
		private readonly likeService: LikeService,
		private readonly viewService: ViewService,
	) {}

	public async createEvent(memberId: ObjectId, input: EventInput): Promise<Event> {
		if (input.eventPrice <= 0) input.eventPrice = 0;
		if (!input?.eventStatus) input.eventStatus = EventStatus.UPCOMING;

		// check who is creating event, is this person a group organizer?

		const groupMember = await this.groupMemberModel.findOne({ memberId, groupId: input.groupId });
		if (!groupMember) {
			throw new Error(Message.NOT_AUTHORIZED);
		}

		const event = await this.eventModel.create({
			...input,
			eventOrganizerId: memberId,
		});
		return event;
	}

	public async getEvent(eventId: ObjectId): Promise<Event> {
		const event = await this.eventModel.findById(eventId).exec();
		if (!event) throw new Error(Message.EVENT_NOT_FOUND);
		return event;
	}

	public async getEvents(input: EventsInquiry): Promise<Events> {
		const { text, category, status } = input.search;
		const match: T = {
			eventStatus: { $ne: EventStatus.DELETED },
		};
		if (status) match.eventStatus = status === EventStatus.DELETED ? { $ne: EventStatus.DELETED } : status;

		if (text) {
			match.$or = [{ eventName: { $regex: new RegExp(text, 'i') } }, { eventDesc: { $regex: new RegExp(text, 'i') } }];
		}
		if (category && category.length > 0) match.eventCategories = { $in: category };

		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		const result = await this.eventModel
			.aggregate([
				{ $match: match },
				{ $sort: sort },
				{
					$facet: {
						list: [{ $skip: (input.page - 1) * input.limit }, { $limit: input.limit }],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();

		if (!result.length) throw new BadRequestException(Message.NO_DATA_FOUND);

		return result[0];
	}

	public async updateEvent(memberId: ObjectId, input: EventUpdateInput): Promise<Event> {
		const event = await this.eventModel.findById(input._id).exec();
		if (!event || event.eventStatus === EventStatus.DELETED) throw new Error(Message.EVENT_NOT_FOUND);
		if (event.eventOrganizerId.toString() !== memberId.toString()) {
			throw new Error(Message.NOT_AUTHORIZED);
		}

		if (input.eventPrice <= 0) input.eventPrice = 0;
		if (input.eventCategories && input.eventCategories.length > 3) {
			input.eventCategories = input.eventCategories.slice(0, 3);
		}

		const updatedEvent = await this.eventModel.findByIdAndUpdate(input._id, input, { new: true }).exec();
		return updatedEvent;
	}

	public async getMyEvents(member: Member): Promise<Event[]> {
		const result = await this.ticketService.getEventsByTickets(member._id, [
			EventStatus.UPCOMING,
			EventStatus.ONGOING,
			EventStatus.COMPLETED,
			EventStatus.CANCELLED,
		]);

		if (member.memberType === MemberType.ORGANIZER) {
			const events = await this.eventModel.find({ eventOrganizerId: member._id }).lean().exec();
			return [...events, ...result].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
		}
		return result;
	}

	public async attendEvent(memberId: ObjectId, eventId: ObjectId): Promise<Event> {
		const event = await this.eventModel.findById(eventId).exec();
		if (!event || event.eventStatus === EventStatus.DELETED) throw new Error(Message.EVENT_NOT_FOUND);

		if (event.eventStatus === EventStatus.CANCELLED) throw new Error(Message.EVENT_CANCELLED);
		if (event.eventStatus === EventStatus.COMPLETED) throw new Error(Message.EVENT_COMPLETED);

		if (event.attendeeCount >= event.eventCapacity) throw new Error(Message.EVENT_FULL);

		if (event.eventPrice > 0) {
			const member = await this.memberModel.findById(memberId).exec();
			if (member.memberPoints < event.eventPrice) throw new Error(Message.INSUFFICIENT_POINTS);
		}

		const ticketExist = await this.ticketService.checkTicketExist(eventId, memberId);
		if (ticketExist && ticketExist.ticketStatus !== TicketStatus.CANCELLED)
			throw new Error(Message.TICKET_ALREADY_PURCHASED);

		const newTicket: TicketInput = {
			eventId: eventId,
			memberId: memberId,
			ticketPrice: event.eventPrice,
			ticketStatus: ticketExist.ticketStatus ?? TicketStatus.PURCHASED,
		};
		const ticket = await this.ticketService.createTicket(newTicket);
		if (!ticket) throw new Error(Message.TICKET_CREATION_FAILED);

		return ticket.event;
	}

	public async withdrawEvent(memberId: ObjectId, eventId: ObjectId): Promise<Event> {
		const event = await this.eventModel.findById(eventId).exec();
		if (!event || event.eventStatus === EventStatus.DELETED) throw new Error(Message.EVENT_NOT_FOUND);
		if (event.eventStatus !== EventStatus.UPCOMING) throw new Error(Message.UNABLE_TO_CANCEL_EVENT);

		const ticketExist = await this.ticketService.checkTicketExist(eventId, memberId);
		if (!ticketExist) throw new Error(Message.TICKET_NOT_FOUND);
		if (ticketExist.ticketStatus === TicketStatus.CANCELLED) throw new Error(Message.TICKET_ALREADY_CANCELLED);

		const ticket = await this.ticketService.cancelTicket(eventId, memberId);
		return ticket.event;
	}

	public async getFavorites(memberId: ObjectId, input: OrdinaryEventInquiry): Promise<Events> {
		return await this.likeService.getFavoriteEvents(memberId, input);
	}

	public async getVisited(memberId: ObjectId, input: OrdinaryEventInquiry): Promise<Events> {
		return await this.viewService.getVisitedEvents(memberId, input);
	}

	// ADMIN ONLY
	public async deleteEventByAdmin(eventId: ObjectId): Promise<Event | null> {
		const event = await this.eventModel.findById(eventId).exec();
		if (!event) throw new Error(Message.EVENT_NOT_FOUND);
		if (event.eventStatus === EventStatus.DELETED) {
			return await this.eventModel.findByIdAndDelete(eventId).exec();
		}
		throw new Error(Message.EVENT_NOT_DELETED);
	}
}
