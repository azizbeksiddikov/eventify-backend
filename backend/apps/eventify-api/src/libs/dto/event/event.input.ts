import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsNumber, IsDate, IsOptional, IsArray } from 'class-validator';
import { EventStatus } from '../../enums/event.enum';

@InputType()
export class CreateEventInput {
	@Field(() => String)
	@IsNotEmpty()
	@IsString()
	eventName: string;

	@Field(() => String)
	@IsNotEmpty()
	@IsString()
	eventDesc: string;

	@Field(() => Date)
	@IsNotEmpty()
	@IsDate()
	eventDate: Date;

	@Field(() => String)
	@IsNotEmpty()
	@IsString()
	eventStartTime: string;

	@Field(() => String)
	@IsNotEmpty()
	@IsString()
	eventEndTime: string;

	@Field(() => String)
	@IsNotEmpty()
	@IsString()
	eventAddress: string;

	@Field(() => String)
	@IsNotEmpty()
	@IsString()
	eventOrganizerId: string;

	@Field(() => Number)
	@IsNotEmpty()
	@IsNumber()
	eventCapacity: number;

	@Field(() => String)
	@IsNotEmpty()
	@IsString()
	eventImage: string;

	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	groupId?: string;

	@Field(() => [String], { defaultValue: [] })
	@IsOptional()
	@IsArray()
	eventCategories?: string[];
}
