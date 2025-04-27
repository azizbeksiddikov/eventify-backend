import { Field, InputType, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsNumber, IsArray, IsEnum, IsDate, Min, MaxLength, IsIn } from 'class-validator';
import { EventStatus, EventCategory } from '../../enums/event.enum';
import { Direction } from '../../enums/common.enum';
import { availableEventsSorts } from '../../config';

@InputType()
export class EventInput {
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

	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsEnum(EventStatus)
	eventStatus?: EventStatus;

	@Field(() => [String])
	@IsNotEmpty()
	@IsArray()
	@IsEnum(EventCategory, { each: true })
	eventCategories: string[];

	// References
	@Field(() => String)
	@IsNotEmpty()
	groupId: string;
}

@InputType()
class ESearch {
	@IsOptional()
	@Field(() => String, { nullable: true })
	text?: string;

	@Field(() => [EventCategory], { nullable: true })
	@IsOptional()
	@IsArray()
	@IsEnum(EventCategory, { each: true })
	category?: EventCategory[];

	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsEnum(EventStatus)
	status?: EventStatus;
}

@InputType()
export class EventsInquiry {
	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	page: number;

	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	limit: number;

	@IsOptional()
	@IsIn(availableEventsSorts)
	@Field(() => String, { nullable: true })
	sort?: string;

	@IsOptional()
	@Field(() => Direction, { nullable: true })
	direction?: Direction;

	@IsNotEmpty()
	@Field(() => ESearch)
	search: ESearch;
}

@InputType()
export class OrdinaryEventInquiry {
	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	page: number;

	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	limit: number;
}
