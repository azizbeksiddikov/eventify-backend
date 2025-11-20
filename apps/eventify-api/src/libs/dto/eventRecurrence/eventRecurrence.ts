import { Field, Int, ObjectType } from '@nestjs/graphql';
import { EventStatus, EventCategory, RecurrenceType } from '../../enums/event.enum';
import { ObjectId } from 'mongoose';

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

	@Field(() => String)
	eventAddress: string;

	@Field(() => String)
	eventCity: string;

	@Field(() => Int, { nullable: true })
	eventCapacity?: number;

	@Field(() => Number)
	eventPrice: number;

	@Field(() => [EventCategory])
	eventCategories: EventCategory[];

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

	// ===== Status =====
	@Field(() => Boolean)
	isActive: boolean;

	// ===== Timestamps =====
	@Field(() => Date)
	createdAt: Date;

	@Field(() => Date)
	updatedAt: Date;
}
