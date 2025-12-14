import { Field, Int, ObjectType } from '@nestjs/graphql';
import { EventStatus, EventCategory, RecurrenceType, EventLocationType } from '../../enums/event.enum';
import { Currency } from '../../enums/common.enum';
import type { ObjectId } from 'mongoose';

@ObjectType()
export class EventRecurrence {
	// ===== ID =====
	@Field(() => String)
	_id: ObjectId;

	// ===== Recurrence Rules =====
	@Field(() => RecurrenceType)
	recurrenceType: RecurrenceType;

	@Field(() => Int, { nullable: true })
	recurrenceInterval?: number;

	@Field(() => [Int], { nullable: true })
	recurrenceDaysOfWeek?: number[];

	@Field(() => Int, { nullable: true })
	recurrenceDayOfMonth?: number;

	@Field(() => Date, { nullable: true })
	recurrenceEndDate?: Date;

	// ===== Template Fields =====
	@Field(() => String)
	eventName: string;

	@Field(() => String)
	eventDesc: string;

	@Field(() => [String])
	eventImages: string[];

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

	@Field(() => Int, { nullable: true })
	eventCapacity?: number;

	@Field(() => Number)
	eventPrice: number;

	@Field(() => Currency, { nullable: true })
	eventCurrency?: Currency;

	@Field(() => [EventCategory])
	eventCategories: EventCategory[];

	@Field(() => [String])
	eventTags: string[];

	@Field(() => EventStatus)
	eventStatus: EventStatus;

	// ===== First Occurrence Template =====
	@Field(() => Date)
	eventStartAt: Date;

	@Field(() => Date)
	eventEndAt: Date;

	// ===== Ownership =====
	@Field(() => String, { nullable: true })
	groupId?: ObjectId;

	@Field(() => String)
	memberId: ObjectId;

	// ===== Origin =====
	@Field(() => String)
	origin: string;

	@Field(() => Boolean)
	isRealEvent: boolean;

	// ===== Status =====
	@Field(() => Boolean)
	isActive: boolean;

	// ===== Timestamps =====
	@Field(() => Date)
	createdAt: Date;

	@Field(() => Date)
	updatedAt: Date;
}
