import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';

// ===== Enums =====
import { Direction, Message } from '../../libs/enums/common.enum';
import { EventStatus } from '../../libs/enums/event.enum';
import { MemberType } from '../../libs/enums/member.enum';
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
import { View } from '../../libs/dto/view/view';
import { ViewInput } from '../../libs/dto/view/view.input';
import { LikeInput } from '../../libs/dto/like/like.input';
import { Group } from '../../libs/dto/group/group';
import { GroupMember } from '../../libs/dto/groupMembers/groupMember';

// ===== Config =====
import { lookupAuthMemberLiked, lookupMember } from '../../libs/config';

// ===== Services =====
import { LikeService } from '../like/like.service';
import { ViewService } from '../view/view.service';
import { MemberService } from '../member/member.service';
import { NotificationType } from '../../libs/enums/notification';
import { NotificationService } from '../notification/notification.service';
import { NotificationInput } from '../../libs/dto/notification/notification.input';

@Injectable()
export class EventService {
	constructor(
		@InjectModel('Event') private readonly eventModel: Model<Event>,
		@InjectModel('Member') private readonly memberModel: Model<Member>,
		@InjectModel('GroupMember') private readonly groupMemberModel: Model<GroupMember>,
		@InjectModel('Group') private readonly groupModel: Model<Group>,
		private readonly likeService: LikeService,
		private readonly viewService: ViewService,
		private readonly memberService: MemberService,
		private readonly notificationService: NotificationService,
	) {}

	// ============== Event Management Methods ==============
	public async createEvent(memberId: ObjectId, input: EventInput): Promise<Event> {
		if (input.eventPrice <= 0) input.eventPrice = 0;
		if (!input?.eventStatus) input.eventStatus = EventStatus.UPCOMING;

		// check for group existence
		const group = await this.groupModel.findById(input.groupId);
		if (!group) throw new BadRequestException(Message.EVENT_GROUP_REQUIRED);

		// check for authorization
		const groupMember = await this.groupMemberModel.findOne({
			memberId,
			groupId: input.groupId,
			groupMemberRole: { $in: [GroupMemberRole.OWNER, GroupMemberRole.MODERATOR] },
		});
		if (!groupMember) throw new BadRequestException(Message.NOT_GROUP_ADMIN);

		try {
			// create event
			const event = await this.eventModel.create({
				...input,
				memberId: memberId,
			});

			// update member stats
			await this.memberModel.findByIdAndUpdate(memberId, { $inc: { eventsOrganizedCount: 1 } });
			await this.groupModel.findByIdAndUpdate(input.groupId, { $inc: { eventsCount: 1 } });

			// create notifications
			const groupMembers: GroupMember[] = await this.groupMemberModel.find({
				_id: { $ne: groupMember._id },
				groupId: input.groupId,
				groupMemberRole: { $in: [GroupMemberRole.OWNER, GroupMemberRole.MODERATOR, GroupMemberRole.MEMBER] },
			});

			groupMembers.forEach(async (groupMember) => {
				const newNotification: NotificationInput = {
					memberId: memberId,
					receiverId: groupMember.memberId,
					notificationType: NotificationType.CREATE_EVENT,
					notificationLink: `/event/detail?eventId=${event._id}`,
				};
				await this.notificationService.createNotification(newNotification);
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
		event.hostingGroup = await this.groupModel.findById(event.groupId).exec();

		event.similarEvents = await this.eventModel
			.aggregate([
				{ $match: { eventCategories: { $in: event.eventCategories }, _id: { $ne: event._id } } },
				{ $sort: { createdAt: Direction.DESC } },
				{ $limit: 5 },
				lookupAuthMemberLiked(memberId),
			])
			.exec();

		return event;
	}

	public async getEvents(memberId: ObjectId | null, input: EventsInquiry): Promise<Events> {
		const pipeline = this.getPipeline(memberId, input);

		const result = await this.eventModel.aggregate(pipeline).exec();
		return result[0];
	}

	private getPipeline(memberId: ObjectId | null, input: EventsInquiry): any[] {
		const { text, eventCategories, eventStatus, eventStartDay, eventEndDay, eventCity } = input.search;
		const match: T = {
			eventStatus: { $ne: EventStatus.DELETED },
		};
		if (eventStatus)
			match.eventStatus = eventStatus === EventStatus.DELETED ? { $ne: EventStatus.DELETED } : eventStatus;

		if (text) {
			match.$or = [{ eventName: { $regex: new RegExp(text, 'i') } }, { eventDesc: { $regex: new RegExp(text, 'i') } }];
		}
		if (eventCategories && eventCategories.length > 0) match.eventCategories = { $in: eventCategories };
		if (eventCity) match.eventCity = { $regex: new RegExp(eventCity, 'i') };

		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };
		if (eventStartDay && eventEndDay) {
			match.eventDate = { $gte: new Date(eventStartDay), $lte: new Date(eventEndDay) };
		} else if (eventStartDay) {
			match.eventDate = { $gte: new Date(eventStartDay) };
		} else if (eventEndDay) {
			match.eventDate = { $lte: new Date(eventEndDay) };
		}

		const pipeline: any[] = [{ $match: match }, { $sort: sort }];
		const facet: any = {
			list: [],
			metaCounter: [{ $count: 'total' }],
		};

		if (input?.limit) {
			const page = input.page > 0 ? input.page : 1;
			facet.list.push({ $skip: (page - 1) * input.limit }, { $limit: input.limit }, lookupAuthMemberLiked(memberId));
		}

		pipeline.push({ $facet: facet });

		return pipeline;
	}

	public async getEventsByCategory(
		memberId: ObjectId | null,
		input: EventsByCategoryInquiry,
	): Promise<EventsByCategory> {
		const categoryEvents = await Promise.all(
			input.categories.map(async (category) => {
				const events = await this.eventModel
					.aggregate([
						{ $match: { eventCategories: category } },
						{ $sort: { createdAt: Direction.DESC } },
						{ $limit: input.limit },
						lookupMember,
						{ $unwind: '$memberData' },
						lookupAuthMemberLiked(memberId),
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

	public async updateEventByOrganizer(memberId: ObjectId, input: EventUpdateInput): Promise<Event> {
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
		if (input.eventStatus === EventStatus.DELETED) {
			await this.memberModel.findByIdAndUpdate(memberId, { $inc: { eventsOrganizedCount: -1 } });
		}
		return updatedEvent;
	}

	// ============== Event Interaction Methods ==============
	public async likeTargetEvent(memberId: ObjectId, likeRefId: ObjectId): Promise<Event> {
		// find event
		const event: Event | null = await this.eventModel.findById(likeRefId).lean().exec();
		if (!event) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		// like => unlike, unlike => like
		const input: LikeInput = { memberId: memberId, likeRefId: likeRefId, likeGroup: LikeGroup.EVENT };
		const newNotification: NotificationInput = {
			memberId: memberId,
			receiverId: event.memberId,
			notificationType: NotificationType.LIKE_EVENT,
			notificationLink: `/event/detail?eventId=${likeRefId}`,
		};
		const modifier = await this.likeService.toggleLike(input, newNotification);

		// update event stats
		await this.eventStatsEditor({ _id: likeRefId, targetKey: 'eventLikes', modifier: modifier });
		event.eventLikes += modifier;

		// AGGREGATED FIELDS
		// find eventorganizer
		event.memberData = await this.memberModel.findById(event.memberId).lean().exec();

		// get meLiked
		if (modifier > 0) {
			event.meLiked = [{ memberId: memberId, likeRefId: likeRefId, myFavorite: true }];
		} else {
			event.meLiked = [];
		}

		return event;
	}

	public async getFavorites(memberId: ObjectId, input: OrdinaryEventInquiry): Promise<Events> {
		return await this.likeService.getFavoriteEvents(memberId, input);
	}

	public async getVisited(memberId: ObjectId, input: OrdinaryEventInquiry): Promise<Events> {
		return await this.viewService.getVisitedEvents(memberId, input);
	}

	// ============== Admin Methods ==============
	public async getAllEventsByAdmin(input: EventsInquiry): Promise<Events> {
		const { text, eventCategories, eventStatus, eventStartDay, eventEndDay } = input.search;
		const sort = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		// ===== Match =====
		const match: T = {};
		if (eventStatus) match.eventStatus = eventStatus;

		if (text) {
			match.$or = [{ eventName: { $regex: new RegExp(text, 'i') } }, { eventDesc: { $regex: new RegExp(text, 'i') } }];
		}
		if (eventCategories && eventCategories.length > 0) match.eventCategories = { $in: eventCategories };

		if (eventStartDay && eventEndDay) {
			match.eventDate = { $gte: new Date(eventStartDay), $lte: new Date(eventEndDay) };
		} else if (eventStartDay) {
			match.eventDate = { $gte: new Date(eventStartDay) };
		} else if (eventEndDay) {
			match.eventDate = { $lte: new Date(eventEndDay) };
		}

		const result = await this.eventModel
			.aggregate([
				{ $match: match },
				{ $sort: sort },
				{
					$facet: {
						list: [{ $skip: input.page - 1 }, { $limit: input.limit }],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();

		return result[0];
	}

	public async updateEventByAdmin(input: EventUpdateInput): Promise<Event> {
		const result: Event | null = await this.eventModel.findByIdAndUpdate(input._id, input, { new: true }).exec();
		if (!result) throw new BadRequestException(Message.UPDATE_FAILED);

		return result;
	}

	public async removeEventByAdmin(eventId: ObjectId): Promise<Event | null> {
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
