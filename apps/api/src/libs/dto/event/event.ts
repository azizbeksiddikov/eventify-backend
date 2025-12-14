import { Field, Int, ObjectType } from '@nestjs/graphql';
import { EventStatus, EventCategory, EventType, EventLocationType } from '../../enums/event.enum';
import { Currency } from '../../enums/common.enum';
import { Member, TotalCounter } from '../member/member';
import type { ObjectId } from 'mongoose';
import { MeLiked } from '../like/like';
import { Group } from '../group/group';

@ObjectType()
export class Event {
	// ===== Basic Information =====
	@Field(() => String)
	_id: ObjectId;

	@Field(() => EventType)
	eventType: EventType;

	@Field(() => String, { nullable: true })
	recurrenceId?: ObjectId;

	@Field(() => String)
	eventName: string;

	@Field(() => String)
	eventDesc: string;

	@Field(() => [String])
	eventImages: string[];

	// ===== Event Timestamps =====
	@Field(() => Date)
	eventStartAt: Date;

	@Field(() => Date)
	eventEndAt: Date;

	// ===== Location Details =====
	@Field(() => EventLocationType)
	locationType: EventLocationType;

	@Field(() => String, { nullable: true })
	eventCity?: string;

	@Field(() => String, { nullable: true })
	eventAddress?: string;

	// Coordinates
	@Field(() => Number, { nullable: true })
	coordinateLatitude?: number;

	@Field(() => Number, { nullable: true })
	coordinateLongitude?: number;

	// ===== Event Details =====
	@Field(() => Int, { nullable: true })
	eventCapacity?: number;

	@Field(() => Number)
	eventPrice: number;

	@Field(() => Currency, { nullable: true })
	eventCurrency?: Currency;

	// ===== Type and Status =====
	@Field(() => EventStatus)
	eventStatus: EventStatus;

	@Field(() => [EventCategory])
	eventCategories: EventCategory[];

	@Field(() => [String])
	eventTags: string[];

	// ===== Internal References =====
	@Field(() => String, { nullable: true })
	groupId?: ObjectId;

	@Field(() => String, { nullable: true })
	memberId?: ObjectId;

	// ===== External Source Information =====
	@Field(() => String)
	origin: string; // 'internal' | 'meetup.com' | 'luma.com' | 'eventbrite.com', etc.

	@Field(() => String, { nullable: true })
	externalId?: string; // Original event ID from external platform

	@Field(() => String, { nullable: true })
	externalUrl?: string; // Link to original event page

	@Field(() => Boolean)
	isRealEvent: boolean;

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
	memberData?: Member | null;

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
