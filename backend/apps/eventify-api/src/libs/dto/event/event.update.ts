import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsString, IsNumber, IsDate, IsArray, IsNotEmpty } from 'class-validator';
import { EventStatus } from '../../enums/event.enum';
import { ObjectId } from 'mongoose';

@InputType()
export class UpdateEventInput {
	@IsNotEmpty()
	@Field(() => String)
	_id: ObjectId;

	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	eventName?: string;

	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	eventDesc?: string;

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
	eventAddress?: string;

	@Field(() => Number, { nullable: true })
	@IsOptional()
	@IsNumber()
	eventCapacity?: number;

	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	eventImage?: string;

	@Field(() => EventStatus, { nullable: true })
	eventStatus?: EventStatus;

	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	groupId?: string;

	@Field(() => [String], { nullable: true })
	@IsOptional()
	@IsArray()
	eventCategories?: string[];
}
