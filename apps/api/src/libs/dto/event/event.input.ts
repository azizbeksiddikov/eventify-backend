import { Field, InputType, Int } from '@nestjs/graphql';
import {
	IsNotEmpty,
	IsOptional,
	IsNumber,
	IsArray,
	IsEnum,
	Min,
	MaxLength,
	IsString,
	IsBoolean,
} from 'class-validator';
import { EventStatus, EventCategory, EventType, EventLocationType } from '../../enums/event.enum';
import { Direction } from '../../enums/common.enum';
import type { ObjectId } from 'mongoose';

// ============== Event Creation Input ==============
@InputType()
export class EventInput {
	// ===== Event Type =====
	@Field(() => EventType, { nullable: true })
	@IsOptional()
	@IsEnum(EventType)
	eventType?: EventType;

	// ===== Basic Information =====
	@Field(() => String)
	@IsNotEmpty()
	@MaxLength(100)
	eventName: string;

	@Field(() => String)
	@IsNotEmpty()
	@MaxLength(2000)
	eventDesc: string;

	@Field(() => [String])
	@IsNotEmpty()
	@IsArray()
	eventImages: string[];

	// ===== Event Timestamps =====
	@Field(() => Date)
	@IsNotEmpty()
	eventStartAt: Date;

	@Field(() => Date)
	@IsNotEmpty()
	eventEndAt: Date;

	@Field(() => String)
	@IsNotEmpty()
	@IsString()
	eventTimezone: string;

	// ===== Location Details =====
	@Field(() => EventLocationType)
	@IsNotEmpty()
	@IsEnum(EventLocationType)
	locationType: EventLocationType;

	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	eventCity?: string;

	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	eventAddress?: string;

	// Coordinates
	@Field(() => Number, { nullable: true })
	@IsOptional()
	@IsNumber()
	coordinateLatitude?: number;

	@Field(() => Number, { nullable: true })
	@IsOptional()
	@IsNumber()
	coordinateLongitude?: number;

	@Field(() => Number, { nullable: true })
	@IsOptional()
	@IsNumber()
	@Min(1)
	eventCapacity?: number;

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

	@Field(() => [String])
	@IsNotEmpty()
	@IsArray()
	@IsString({ each: true })
	eventTags: string[];

	// ===== External Source Information =====
	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	externalId?: string;

	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	externalUrl?: string;

	@Field(() => Boolean, { nullable: true })
	@IsOptional()
	@IsBoolean()
	isRealEvent?: boolean;

	// ===== References =====
	@Field(() => String, { nullable: true })
	@IsOptional()
	groupId?: ObjectId;
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
