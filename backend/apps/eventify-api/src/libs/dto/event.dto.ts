import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { IsDate, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { EventStatus } from '../enums/common.enum';

@ObjectType()
export class Event {
	@Field()
	_id: string;

	@Field()
	eventName: string;

	@Field()
	eventDesc: string;

	@Field()
	eventDate: Date;

	@Field()
	eventStartTime: string;

	@Field()
	eventEndTime: string;

	@Field()
	eventAddress: string;

	@Field()
	eventOrganizerId: string;

	@Field()
	eventCapacity: number;

	@Field()
	attendeeCount: number;

	@Field({ nullable: true })
	eventImage?: string;

	@Field(() => EventStatus)
	eventStatus: EventStatus;

	@Field()
	groupId: string;

	@Field(() => [String])
	eventCategories: string[];

	@Field()
	eventLikes: number;

	@Field()
	eventViews: number;

	@Field()
	createdAt: Date;

	@Field()
	updatedAt: Date;
}

@InputType()
export class CreateEventDto {
	@Field()
	@IsString()
	@IsNotEmpty()
	eventName: string;

	@Field()
	@IsString()
	@IsNotEmpty()
	eventDesc: string;

	@Field()
	@IsDate()
	@IsNotEmpty()
	eventDate: Date;

	@Field()
	@IsString()
	@IsNotEmpty()
	eventStartTime: string;

	@Field()
	@IsString()
	@IsNotEmpty()
	eventEndTime: string;

	@Field()
	@IsString()
	@IsNotEmpty()
	eventAddress: string;

	@Field()
	@IsString()
	@IsNotEmpty()
	eventOrganizerId: string;

	@Field()
	@IsNumber()
	@Min(1)
	eventCapacity: number;

	@Field()
	@IsString()
	@IsNotEmpty()
	groupId: string;

	@Field(() => [String])
	@IsString({ each: true })
	eventCategories: string[];
}

@InputType()
export class UpdateEventDto {
	@Field({ nullable: true })
	@IsString()
	@IsOptional()
	eventName?: string;

	@Field({ nullable: true })
	@IsString()
	@IsOptional()
	eventDesc?: string;

	@Field({ nullable: true })
	@IsDate()
	@IsOptional()
	eventDate?: Date;

	@Field({ nullable: true })
	@IsString()
	@IsOptional()
	eventStartTime?: string;

	@Field({ nullable: true })
	@IsString()
	@IsOptional()
	eventEndTime?: string;

	@Field({ nullable: true })
	@IsString()
	@IsOptional()
	eventAddress?: string;

	@Field({ nullable: true })
	@IsNumber()
	@Min(1)
	@IsOptional()
	eventCapacity?: number;

	@Field({ nullable: true })
	@IsString()
	@IsOptional()
	eventImage?: string;

	@Field(() => EventStatus, { nullable: true })
	@IsEnum(EventStatus)
	@IsOptional()
	eventStatus?: EventStatus;

	@Field(() => [String], { nullable: true })
	@IsString({ each: true })
	@IsOptional()
	eventCategories?: string[];
}
