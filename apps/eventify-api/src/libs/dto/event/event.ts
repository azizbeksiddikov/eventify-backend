import { Field, Int, ObjectType } from '@nestjs/graphql';
import { EventStatus, EventCategory } from '../../enums/event.enum';
import { Member, TotalCounter } from '../member/member';
import { ObjectId } from 'mongoose';
import { MeLiked } from '../like/like';
import { Group, MeJoined } from '../group/group';

@ObjectType()
export class Event {
	// ===== Basic Information =====
	@Field(() => String)
	_id: ObjectId;

	@Field(() => String)
	eventName: string;

	@Field(() => String)
	eventDesc: string;

	@Field(() => String)
	eventImage: string;

	// ===== Event Timestamps =====
	@Field(() => Date)
	eventStartAt: Date;

	@Field(() => Date)
	eventEndAt: Date;

	// ===== Event Details =====
	@Field(() => String)
	eventCity: string;

	@Field(() => String)
	eventAddress: string;

	@Field(() => Int)
	eventCapacity: number;

	@Field(() => Number)
	eventPrice: number;

	// ===== Type and Status =====
	@Field(() => EventStatus)
	eventStatus: EventStatus;

	@Field(() => [EventCategory])
	eventCategories: EventCategory[];

	// ===== References =====
	@Field(() => String)
	groupId: ObjectId;

	@Field(() => String)
	memberId: ObjectId;

	// ===== Statistics =====
	@Field(() => Int)
	attendeeCount: number;

	@Field(() => Int)
	eventLikes: number;

	@Field(() => Int)
	eventViews: number;

	// ===== Timestamps =====
	@Field(() => Date)
	createdAt: Date;

	@Field(() => Date)
	updatedAt: Date;

	// ===== Aggregated Fields =====
	@Field(() => Member, { nullable: true })
	memberData?: Member;

	@Field(() => Group, { nullable: true })
	hostingGroup?: Group;

	@Field(() => [MeLiked], { nullable: true })
	meLiked?: MeLiked[];

	@Field(() => [Event], { nullable: true })
	similarEvents?: Event[];
}

@ObjectType()
export class Events {
	@Field(() => [Event])
	list: Event[];

	@Field(() => [TotalCounter], { nullable: true })
	metaCounter: TotalCounter[];
}

@ObjectType()
export class CategoryEvents {
	@Field(() => String)
	category: EventCategory;

	@Field(() => [Event])
	events: Event[];
}

@ObjectType()
export class EventsByCategory {
	@Field(() => [CategoryEvents])
	categories: CategoryEvents[];
}
