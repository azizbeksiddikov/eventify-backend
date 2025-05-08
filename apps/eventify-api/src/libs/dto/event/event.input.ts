import { Field, InputType, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsNumber, IsArray, IsEnum, IsDate, Min, MaxLength, IsIn } from 'class-validator';
import { EventStatus, EventCategory } from '../../enums/event.enum';
import { Direction } from '../../enums/common.enum';
import { ObjectId } from 'mongoose';

// ============== Event Creation Input ==============
@InputType()
export class EventInput {
	// ===== Basic Information =====
	@Field(() => String)
	@IsNotEmpty()
	@MaxLength(100)
	eventName: string;

	@Field(() => String)
	@IsNotEmpty()
	@MaxLength(2000)
	eventDesc: string;

	@Field(() => String)
	@IsNotEmpty()
	eventImage: string;

	// ===== Event Details =====
	@Field(() => Date)
	@IsNotEmpty()
	@IsDate()
	eventDate: Date;

	@Field(() => String)
	@IsNotEmpty()
	eventStartTime: string;

	@Field(() => String)
	@IsNotEmpty()
	eventEndTime: string;

	@Field(() => String)
	@IsNotEmpty()
	@MaxLength(100)
	eventCity: string;

	@Field(() => String)
	@IsNotEmpty()
	@MaxLength(200)
	eventAddress: string;

	@Field(() => Number)
	@IsNotEmpty()
	@IsNumber()
	@Min(1)
	eventCapacity: number;

	@Field(() => Number, { nullable: true })
	@IsOptional()
	@IsNumber()
	@Min(0)
	eventPrice?: number;

	// ===== Type and Status =====
	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsEnum(EventStatus)
	eventStatus?: EventStatus;

	@Field(() => [String])
	@IsNotEmpty()
	@IsArray()
	@IsEnum(EventCategory, { each: true })
	eventCategories: EventCategory[];

	// ===== References =====
	@Field(() => String)
	@IsNotEmpty()
	groupId: ObjectId;
}

// ============== Search Inputs ==============
@InputType()
class EISearch {
	@IsOptional()
	@Field(() => String, { nullable: true })
	text?: string;

	@Field(() => [EventCategory], { nullable: true })
	@IsOptional()
	@IsArray()
	@IsEnum(EventCategory, { each: true })
	eventCategories?: EventCategory[];

	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsEnum(EventStatus)
	eventStatus?: EventStatus;

	@Field(() => String, { nullable: true })
	@IsOptional()
	eventStartDay?: Date;

	@Field(() => String, { nullable: true })
	@IsOptional()
	eventEndDay?: Date;

	@Field(() => String, { nullable: true })
	@IsOptional()
	eventCity?: string;

	@Field(() => String, { nullable: true })
	@IsOptional()
	eventAddress?: string;
}

// ============== Inquiry Inputs ==============
@InputType()
export class EventsInquiry {
	// ===== Pagination =====
	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	page: number;

	@IsOptional()
	@Field(() => Int, { nullable: true })
	limit?: number;

	// ===== Sorting =====
	@IsOptional()
	@Field(() => String, { nullable: true })
	sort?: string;

	@IsOptional()
	@Field(() => Direction, { nullable: true })
	direction?: Direction;

	// ===== Search =====
	@IsNotEmpty()
	@Field(() => EISearch)
	search: EISearch;
}

@InputType()
export class OrdinaryEventInquiry {
	// ===== Pagination =====
	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	page: number;

	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	limit: number;
}

@InputType()
export class EventsByCategoryInquiry {
	@IsNotEmpty()
	@Field(() => [EventCategory])
	categories: EventCategory[];

	@IsNotEmpty()
	@Field(() => Int)
	limit: number;
}
