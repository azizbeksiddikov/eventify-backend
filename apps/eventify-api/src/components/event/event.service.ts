import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';

// ===== Enums =====
import { Direction, Message } from '../../libs/enums/common.enum';
import { EventStatus, EventType } from '../../libs/enums/event.enum';
import { LikeGroup } from '../../libs/enums/like.enum';
import { ViewGroup } from '../../libs/enums/view.enum';
import { NotificationType } from '../../libs/enums/notification.enum';

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
import { View } from '../../libs/dto/view/view';
import { ViewInput } from '../../libs/dto/view/view.input';
import { LikeInput } from '../../libs/dto/like/like.input';
import { GroupMember } from '../../libs/dto/groupMembers/groupMember';
import { NotificationInput } from '../../libs/dto/notification/notification.input';

// ===== Config =====
import { lookupAuthMemberLiked, lookupMember } from '../../libs/config';

// ===== Services =====
import { AgendaService } from '../agenda/agenda.service';
import { LikeService } from '../like/like.service';
import { ViewService } from '../view/view.service';
import { MemberService } from '../member/member.service';
import { NotificationService } from '../notification/notification.service';
import { GroupService } from '../group/group.service';

@Injectable()
export class EventService {
	constructor(
		@InjectModel('Event') private readonly eventModel: Model<Event>,
		@InjectModel('EventRecurrence') private readonly eventRecurrenceModel: Model<any>,
		private readonly agendaService: AgendaService,
		private readonly likeService: LikeService,
		private readonly viewService: ViewService,
		private readonly notificationService: NotificationService,
		private readonly memberService: MemberService,
		private readonly groupService: GroupService,
	) {}

	// ============== Event Management Methods ==============
	public async createEvent(memberId: ObjectId, input: EventInput): Promise<Event> {
		// Validation: createEvent is only for ONE-TIME events
		if (input.eventType && input.eventType !== EventType.ONCE) {
			throw new BadRequestException('Use createRecurringEvent mutation for recurring events');
		}

		if (input.eventPrice <= 0) input.eventPrice = 0;
		if (!input?.eventStatus) input.eventStatus = EventStatus.UPCOMING;
		if (!input?.eventType) input.eventType = EventType.ONCE;

		// check for group existence if provided
		if (input.groupId) {
			const group = await this.groupService.getSimpleGroup(input.groupId);

			// check for authorization
			const groupAdmin = await this.groupService.isAuthorized(memberId, input.groupId);
			if (!groupAdmin) throw new BadRequestException(Message.NOT_GROUP_ADMIN);
		}

		try {
			// create event
			const event = await this.eventModel.create({
				...input,
				memberId: memberId,
			});

			// update member stats
			await this.memberService.memberStatsEditor({
				_id: memberId,
				targetKey: 'eventsOrganizedCount',
				modifier: 1,
			});

			if (input.groupId) {
				await this.groupService.groupStatsEditor({
					_id: input.groupId,
					targetKey: 'eventsCount',
					modifier: 1,
				});
			}

			// create notifications (only if event is part of a group)
			if (input.groupId) {
				const groupMembers: GroupMember[] = await this.groupService.getOtherGroupMembers(memberId, input.groupId);

				groupMembers.forEach(async (groupMember) => {
					const newNotification: NotificationInput = {
						memberId: memberId,
						receiverId: groupMember.memberId,
						notificationType: NotificationType.CREATE_EVENT,
						notificationLink: `/event/detail?eventId=${event._id}`,
					};
					await this.notificationService.createNotification(newNotification);
				});
			}

			// schedule event status auto-update jobs
			if (
				event.eventStatus === EventStatus.UPCOMING &&
				event.eventStartAt > new Date() &&
				event.eventEndAt > new Date()
			) {
				await this.agendaService.scheduleEventStart(event._id, event.eventStartAt);
				await this.agendaService.scheduleEventEnd(event._id, event.eventEndAt);
			}

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
		event.hostingGroup = await this.groupService.getSimpleGroup(event.groupId);

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
		if (eventStartDay) match.eventStartAt = { $gte: new Date(eventStartDay) };
		if (eventEndDay) match.eventEndAt = { $lte: new Date(eventEndDay) };

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

		// Handle updateAllFuture for recurring events
		if (input.updateAllFuture && event.recurrenceId) {
			await this.updateRecurringEventAndFuture(event, input);
		} else {
			// Update single event only
			// cancel existing jobs before update
			await this.agendaService.cancelEventJobs(input._id);

			const updatedEvent = await this.eventModel.findByIdAndUpdate(input._id, input, { new: true }).exec();
			if (input.eventStatus === EventStatus.DELETED) {
				await this.memberService.memberStatsEditor({
					_id: memberId,
					targetKey: 'eventsOrganizedCount',
					modifier: -1,
				});
			} else if (updatedEvent.eventStatus === EventStatus.UPCOMING) {
				// reschedule jobs if status is UPCOMING and dates are in future
				const startAt = input.eventStartAt || updatedEvent.eventStartAt;
				const endAt = input.eventEndAt || updatedEvent.eventEndAt;
				if (startAt > new Date() && endAt > new Date()) {
					await this.agendaService.rescheduleEventJobs(updatedEvent._id, startAt, endAt);
				}
			}
			return updatedEvent;
		}

		return await this.eventModel.findById(input._id).exec();
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
		event.memberData = await this.memberService.getSimpleMember(event.memberId);

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

		if (eventStartDay) match.eventStartAt = { $gte: new Date(eventStartDay) };
		if (eventEndDay) match.eventEndAt = { $lte: new Date(eventEndDay) };

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
		// cancel existing jobs before update
		await this.agendaService.cancelEventJobs(input._id);

		const result: Event | null = await this.eventModel.findByIdAndUpdate(input._id, input, { new: true }).exec();
		if (!result) throw new BadRequestException(Message.UPDATE_FAILED);

		// reschedule jobs if status is UPCOMING and dates are in future
		if (result.eventStatus === EventStatus.UPCOMING) {
			const startAt = input.eventStartAt || result.eventStartAt;
			const endAt = input.eventEndAt || result.eventEndAt;
			if (startAt > new Date() && endAt > new Date()) {
				await this.agendaService.rescheduleEventJobs(result._id, startAt, endAt);
			}
		}

		return result;
	}

	public async removeEventByAdmin(eventId: ObjectId): Promise<Event | null> {
		const event = await this.eventModel.findById(eventId).exec();
		if (!event) throw new Error(Message.EVENT_NOT_FOUND);

		// cancel all jobs for this event
		await this.agendaService.cancelEventJobs(eventId);

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

	public async getSimpleEvent(eventId: ObjectId): Promise<Event> {
		const event = await this.eventModel.findById(eventId).lean().exec();
		if (!event) throw new Error(Message.EVENT_NOT_FOUND);
		return event;
	}

	private async updateRecurringEventAndFuture(event: Event, input: EventUpdateInput): Promise<void> {
		// Update EventRecurrence template
		const updateFields: any = {};
		if (input.eventName) updateFields.eventName = input.eventName;
		if (input.eventDesc) updateFields.eventDesc = input.eventDesc;
		if (input.eventImages) updateFields.eventImages = input.eventImages;
		if (input.eventAddress) updateFields.eventAddress = input.eventAddress;
		if (input.eventCity) updateFields.eventCity = input.eventCity;
		if (input.eventCapacity !== undefined) updateFields.eventCapacity = input.eventCapacity;
		if (input.eventPrice !== undefined) updateFields.eventPrice = input.eventPrice;
		if (input.eventCategories) updateFields.eventCategories = input.eventCategories;
		if (input.eventStatus) updateFields.eventStatus = input.eventStatus;

		await this.eventRecurrenceModel.findByIdAndUpdate(event.recurrenceId, updateFields).exec();

		// Find all future events
		const futureEvents = await this.eventModel
			.find({
				recurrenceId: event.recurrenceId,
				eventStartAt: { $gte: event.eventStartAt },
				eventStatus: { $in: [EventStatus.UPCOMING, EventStatus.ONGOING] },
			})
			.exec();

		// Update each future event
		for (const futureEvent of futureEvents) {
			// Cancel existing jobs
			await this.agendaService.cancelEventJobs(futureEvent._id);

			// Update event fields
			Object.assign(futureEvent, updateFields);
			await futureEvent.save();

			// Reschedule jobs if status is UPCOMING
			if (futureEvent.eventStatus === EventStatus.UPCOMING && futureEvent.eventStartAt > new Date()) {
				await this.agendaService.scheduleEventStart(futureEvent._id, futureEvent.eventStartAt);
				await this.agendaService.scheduleEventEnd(futureEvent._id, futureEvent.eventEndAt);
			}
		}
	}
}
