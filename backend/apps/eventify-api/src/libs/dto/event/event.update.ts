import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsString, IsNumber, IsDate, IsArray, IsNotEmpty, Min, MaxLength, IsEnum } from 'class-validator';
import { EventStatus, EventCategory } from '../../enums/event.enum';
import { ObjectId } from 'mongoose';

@InputType()
export class EventUpdateInput {
	@IsNotEmpty()
	@Field(() => String)
	_id: ObjectId;

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

	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	eventImage?: string;

	@Field(() => Date, { nullable: true })
	@IsOptional()
	@IsDate()
	eventDate?: Date;

	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	eventStartTime?: string;

	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	eventEndTime?: string;

	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
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

	@Field(() => EventStatus, { nullable: true })
	@IsOptional()
	@IsEnum(EventStatus)
	eventStatus?: EventStatus;

	@Field(() => [String], { nullable: true })
	@IsOptional()
	@IsArray()
	@IsEnum(EventCategory, { each: true })
	eventCategories?: EventCategory[];
}
