import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';

// ===== Enums =====
import { Direction, Message } from '../../libs/enums/common.enum';
import { EventStatus } from '../../libs/enums/event.enum';
import { MemberType } from '../../libs/enums/member.enum';
import { TicketStatus } from '../../libs/enums/ticket.enum';
import { LikeGroup } from '../../libs/enums/like.enum';
import { ViewGroup } from '../../libs/enums/view.enum';
import { GroupMemberRole } from '../../libs/enums/group.enum';

// ===== Types & DTOs =====
import { StatisticModifier, T } from '../../libs/types/common';
import { Event, Events, EventsByCategory } from '../../libs/dto/event/event';
import {
	EventInput,
	EventsByCategoryInquiry,
	EventsInquiry,
	OrdinaryEventInquiry,
} from '../../libs/dto/event/event.input';
import { EventUpdateInput } from '../../libs/dto/event/event.update';
import { Member } from '../../libs/dto/member/member';
import { Ticket } from '../../libs/dto/ticket/ticket';
import { TicketInput } from '../../libs/dto/ticket/ticket.input';
import { View } from '../../libs/dto/view/view';
import { ViewInput } from '../../libs/dto/view/view.input';
import { LikeInput } from '../../libs/dto/like/like.input';
import { Group } from '../../libs/dto/group/group';
import { GroupMember } from '../../libs/dto/groupMembers/groupMember';

// ===== Config =====
import { lookupMember } from '../../libs/config';

// ===== Services =====
import { TicketService } from '../ticket/ticket.service';
import { LikeService } from '../like/like.service';
import { ViewService } from '../view/view.service';
import { MemberService } from '../member/member.service';

@Injectable()
export class EventService {
	constructor(
		@InjectModel('Event') private readonly eventModel: Model<Event>,
		@InjectModel('Ticket') private readonly ticketModel: Model<Ticket>,
		@InjectModel('Member') private readonly memberModel: Model<Member>,
		@InjectModel('GroupMember') private readonly groupMemberModel: Model<GroupMember>,
		@InjectModel('Group') private readonly groupModel: Model<Group>,
		private readonly ticketService: TicketService,
		private readonly likeService: LikeService,
		private readonly viewService: ViewService,
		private readonly memberService: MemberService,
	) {}

	// ============== Event Management Methods ==============
	public async createEvent(memberId: ObjectId, input: EventInput): Promise<Event> {
		if (input.eventPrice <= 0) input.eventPrice = 0;
		if (!input?.eventStatus) input.eventStatus = EventStatus.UPCOMING;

		const group = await this.groupModel.findById(input.groupId);
		if (!group) {
			throw new BadRequestException(Message.EVENT_GROUP_REQUIRED);
		}

		const groupMember = await this.groupMemberModel.findOne({
			memberId,
			groupId: input.groupId,
			groupMemberRole: { $in: [GroupMemberRole.OWNER, GroupMemberRole.MODERATOR] },
		});
		if (!groupMember) {
			throw new BadRequestException(Message.NOT_AUTHORIZED);
		}

		try {
			const event = await this.eventModel.create({
				...input,
				memberId: memberId,
			});
			return event;
		} catch (error) {
			throw new BadRequestException(Message.EVENT_ALREADY_EXISTS);
		}
	}

	public async getEvent(memberId: ObjectId | null, eventId: ObjectId): Promise<Event> {
		const search: T = {
			_id: eventId,
			eventStatus: { $ne: EventStatus.DELETED },
		};

		const event = await this.eventModel.findOne(search).exec();
		if (!event) throw new Error(Message.EVENT_NOT_FOUND);

		if (memberId) {
			const viewInput: ViewInput = { memberId: memberId, viewRefId: eventId, viewGroup: ViewGroup.EVENT };
			const newView: View | null = await this.viewService.recordView(viewInput);

			if (newView) {
				await this.eventStatsEditor({ _id: eventId, targetKey: 'eventViews', modifier: 1 });
				event.eventViews += 1;
			}

			const likeInput: LikeInput = { memberId: memberId, likeRefId: eventId, likeGroup: LikeGroup.EVENT };
			event.meLiked = await this.likeService.checkLikeExistence(likeInput);
		}
		event.memberData = await this.memberService.getMember(null, event.memberId);

		return event;
	}

	public async getEvents(input: EventsInquiry): Promise<Events> {
		const pipeline = this.getPipeline(input);

		const result = await this.eventModel.aggregate(pipeline).exec();

		if (!result.length) throw new BadRequestException(Message.NO_DATA_FOUND);

		return result[0];
	}

	private getPipeline(input: EventsInquiry): any[] {
		const { text, eventCategories, eventStatus, eventStartDay, eventEndDay } = input.search;
		const match: T = {
			eventStatus: { $ne: EventStatus.DELETED },
		};
		if (eventStatus)
			match.eventStatus = eventStatus === EventStatus.DELETED ? { $ne: EventStatus.DELETED } : eventStatus;

		if (text) {
			match.$or = [{ eventName: { $regex: new RegExp(text, 'i') } }, { eventDesc: { $regex: new RegExp(text, 'i') } }];
		}
		if (eventCategories && eventCategories.length > 0) match.eventCategories = { $in: eventCategories };

		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };
		if (eventStartDay && eventEndDay) {
			match.eventStartDay = { $gte: new Date(eventStartDay), $lte: new Date(eventEndDay) };
		} else if (eventStartDay) {
			match.eventStartDay = { $gte: new Date(eventStartDay) };
		} else if (eventEndDay) {
			match.eventEndDay = { $lte: new Date(eventEndDay) };
		}

		const pipeline: any[] = [{ $match: match }, { $sort: sort }];
		const facet: any = {
			list: [],
			metaCounter: [{ $count: 'total' }],
		};

		if (input?.limit) {
			const page = input.page > 0 ? input.page : 1;
			facet.list.push({ $skip: (page - 1) * input.limit }, { $limit: input.limit });
		}

		pipeline.push({ $facet: facet });

		return pipeline;
	}

	public async getEventsByCategory(input: EventsByCategoryInquiry): Promise<EventsByCategory> {
		const categoryEvents = await Promise.all(
			input.categories.map(async (category) => {
				const events = await this.eventModel
					.aggregate([
						{ $match: { eventCategories: category } },
						{ $sort: { createdAt: Direction.DESC } },
						{ $limit: input.limit },
					])
					.exec();

				return {
					category,
					events: events.length ? events : [],
				};
			}),
		);

		return {
			categories: categoryEvents,
		};
	}

	public async updateEvent(memberId: ObjectId, input: EventUpdateInput): Promise<Event> {
		const event = await this.eventModel.findById(input._id).exec();
		if (!event || event.eventStatus === EventStatus.DELETED) throw new Error(Message.EVENT_NOT_FOUND);
		if (event.memberId.toString() !== memberId.toString()) {
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
			const events = await this.eventModel.find({ memberId: member._id }).lean().exec();
			return [...events, ...result].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
		}
		return result;
	}

	// ============== Event Interaction Methods ==============
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

	public async likeTargetEvent(memberId: ObjectId, likeRefId: ObjectId): Promise<Event> {
		const target: Event | null = await this.eventModel
			.findOne({ _id: likeRefId, eventStatus: { $ne: EventStatus.DELETED } })
			.exec();
		if (!target) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		const input: LikeInput = { memberId: memberId, likeRefId: likeRefId, likeGroup: LikeGroup.EVENT };

		const modifier = await this.likeService.toggleLike(input);
		const result = await this.eventStatsEditor({ _id: likeRefId, targetKey: 'eventLikes', modifier: modifier });
		if (!result) throw new InternalServerErrorException(Message.SOMETHING_WENT_WRONG);

		return result;
	}

	public async getFavorites(memberId: ObjectId, input: OrdinaryEventInquiry): Promise<Events> {
		return await this.likeService.getFavoriteEvents(memberId, input);
	}

	public async getVisited(memberId: ObjectId, input: OrdinaryEventInquiry): Promise<Events> {
		return await this.viewService.getVisitedEvents(memberId, input);
	}

	// ============== Admin Methods ==============
	public async getAllEventsByAdmin(input: EventsInquiry): Promise<Events> {
		const { page, limit, sort, direction, search } = input;
		const { text, eventCategories, eventStatus } = search;

		const match: T = {};
		const sortFinal = { [sort ?? 'createdAt']: direction ?? Direction.DESC };
		if (status) match.eventStatus = status;

		if (text) {
			match.$or = [{ eventName: { $regex: new RegExp(text, 'i') } }, { eventDesc: { $regex: new RegExp(text, 'i') } }];
		}
		if (eventCategories && eventCategories.length > 0) match.eventCategories = { $in: eventCategories };

		const result = await this.eventModel
			.aggregate([
				{ $match: match },
				{ $sort: sortFinal },
				{
					$facet: {
						list: [{ $skip: page - 1 }, { $limit: limit }, lookupMember, { $unwind: '$memberData' }],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();
		if (!result) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		return result[0];
	}

	public async deleteEventByAdmin(eventId: ObjectId): Promise<Event | null> {
		const event = await this.eventModel.findById(eventId).exec();
		if (!event) throw new Error(Message.EVENT_NOT_FOUND);
		if (event.eventStatus === EventStatus.DELETED) {
			return await this.eventModel.findByIdAndDelete(eventId).exec();
		}
		throw new Error(Message.EVENT_NOT_DELETED);
	}

	// ============== Helper Methods ==============
	public async eventStatsEditor(input: StatisticModifier): Promise<Event> {
		const { _id, targetKey, modifier } = input;
		const event = await this.eventModel
			.findByIdAndUpdate(_id, { $inc: { [targetKey]: modifier } }, { new: true })
			.exec();
		return event;
	}
}
