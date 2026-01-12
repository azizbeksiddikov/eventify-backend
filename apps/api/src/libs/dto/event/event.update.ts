import { Field, InputType } from '@nestjs/graphql';
import {
	IsOptional,
	IsString,
	IsNumber,
	IsArray,
	IsNotEmpty,
	IsBoolean,
	Min,
	MaxLength,
	IsEnum,
} from 'class-validator';
import { EventStatus, EventCategory, EventLocationType } from '../../enums/event.enum';
import type { ObjectId } from 'mongoose';

@InputType()
export class EventUpdateInput {
	// ===== Identification =====
	@IsNotEmpty()
	@Field(() => String)
	_id: ObjectId;

	// ===== Recurring Event Update Option =====
	@Field(() => Boolean, { nullable: true })
	@IsOptional()
	@IsBoolean()
	updateAllFuture?: boolean;

	// ===== Basic Information =====
	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	@MaxLength(100)
	eventName?: string;

	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	@MaxLength(2000)
	eventDesc?: string;

	@Field(() => [String], { nullable: true })
	@IsOptional()
	@IsArray()
	eventImages?: string[];

	// ===== Event Timestamps =====
	@Field(() => Date, { nullable: true })
	@IsOptional()
	eventStartAt?: Date;

	@Field(() => Date, { nullable: true })
	@IsOptional()
	eventEndAt?: Date;

	// ===== Location Details =====
	@Field(() => EventLocationType, { nullable: true })
	@IsOptional()
	@IsEnum(EventLocationType)
	locationType?: EventLocationType;

	// ===== Event Details =====
	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	@MaxLength(100)
	eventCity?: string;

	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	@MaxLength(200)
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

	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	eventCurrency?: string;

	// ===== Type and Status =====
	@Field(() => EventStatus, { nullable: true })
	@IsOptional()
	@IsEnum(EventStatus)
	eventStatus?: EventStatus;

	@Field(() => [String], { nullable: true })
	@IsOptional()
	@IsArray()
	@IsEnum(EventCategory, { each: true })
	eventCategories?: EventCategory[];

	@Field(() => [String], { nullable: true })
	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	eventTags?: string[];

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
}
