import { Field, InputType, Int } from '@nestjs/graphql';
import {
	IsNotEmpty,
	IsOptional,
	IsNumber,
	IsArray,
	IsEnum,
	IsBoolean,
	Min,
	MaxLength,
	ValidateIf,
} from 'class-validator';
import { EventStatus, EventCategory, RecurrenceType } from '../../enums/event.enum';
import type { ObjectId } from 'mongoose';

@InputType()
export class EventRecurrenceInput {
	// ===== Recurrence Rules =====
	@Field(() => RecurrenceType)
	@IsNotEmpty()
	@IsEnum(RecurrenceType)
	recurrenceType: RecurrenceType;

	@Field(() => Int, { nullable: true })
	@IsOptional()
	@IsNumber()
	@Min(1)
	@ValidateIf((o) => o.recurrenceType === RecurrenceType.INTERVAL)
	recurrenceInterval?: number;

	@Field(() => [Int], { nullable: true })
	@IsOptional()
	@IsArray()
	@ValidateIf((o) => o.recurrenceType === RecurrenceType.DAYS_OF_WEEK)
	recurrenceDaysOfWeek?: number[];

	@Field(() => Int, { nullable: true })
	@IsOptional()
	@IsNumber()
	@Min(1)
	@ValidateIf((o) => o.recurrenceType === RecurrenceType.DAY_OF_MONTH)
	recurrenceDayOfMonth?: number;

	@Field(() => Date, { nullable: true })
	@IsOptional()
	recurrenceEndDate?: Date;

	// ===== Template Fields =====
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

	@Field(() => String)
	@IsNotEmpty()
	@MaxLength(100)
	eventCity: string;

	@Field(() => String)
	@IsNotEmpty()
	@MaxLength(200)
	eventAddress: string;

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
	@IsEnum(EventStatus)
	eventStatus?: EventStatus;

	@Field(() => [String])
	@IsNotEmpty()
	@IsArray()
	@IsEnum(EventCategory, { each: true })
	eventCategories: EventCategory[];

	// ===== First Occurrence Template =====
	@Field(() => Date)
	@IsNotEmpty()
	eventStartAt: Date;

	@Field(() => Date)
	@IsNotEmpty()
	eventEndAt: Date;

	// ===== References =====
	@Field(() => String, { nullable: true })
	@IsOptional()
	groupId?: ObjectId;
}

@InputType()
export class EventRecurrenceUpdateInput {
	@Field(() => String)
	@IsNotEmpty()
	_id: ObjectId;

	@Field(() => Boolean, { nullable: true })
	@IsOptional()
	@IsBoolean()
	updateAllFuture?: boolean;

	// ===== Recurrence Rules =====
	@Field(() => RecurrenceType, { nullable: true })
	@IsOptional()
	@IsEnum(RecurrenceType)
	recurrenceType?: RecurrenceType;

	@Field(() => Int, { nullable: true })
	@IsOptional()
	@IsNumber()
	@Min(1)
	recurrenceInterval?: number;

	@Field(() => [Int], { nullable: true })
	@IsOptional()
	@IsArray()
	recurrenceDaysOfWeek?: number[];

	@Field(() => Int, { nullable: true })
	@IsOptional()
	@IsNumber()
	@Min(1)
	recurrenceDayOfMonth?: number;

	@Field(() => Date, { nullable: true })
	@IsOptional()
	recurrenceEndDate?: Date;

	// ===== Template Fields =====
	@Field(() => String, { nullable: true })
	@IsOptional()
	@MaxLength(100)
	eventName?: string;

	@Field(() => String, { nullable: true })
	@IsOptional()
	@MaxLength(2000)
	eventDesc?: string;

	@Field(() => [String], { nullable: true })
	@IsOptional()
	@IsArray()
	eventImages?: string[];

	@Field(() => String, { nullable: true })
	@IsOptional()
	@MaxLength(100)
	eventCity?: string;

	@Field(() => String, { nullable: true })
	@IsOptional()
	@MaxLength(200)
	eventAddress?: string;

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
	@IsEnum(EventStatus)
	eventStatus?: EventStatus;

	@Field(() => [String], { nullable: true })
	@IsOptional()
	@IsArray()
	@IsEnum(EventCategory, { each: true })
	eventCategories?: EventCategory[];

	@Field(() => Date, { nullable: true })
	@IsOptional()
	eventStartAt?: Date;

	@Field(() => Date, { nullable: true })
	@IsOptional()
	eventEndAt?: Date;

	@Field(() => String, { nullable: true })
	@IsOptional()
	groupId?: ObjectId;

	@Field(() => Boolean, { nullable: true })
	@IsOptional()
	@IsBoolean()
	isActive?: boolean;
}
