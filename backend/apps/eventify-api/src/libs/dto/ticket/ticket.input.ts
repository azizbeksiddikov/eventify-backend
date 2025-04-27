import { Field, InputType, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsNumber, IsEnum, IsOptional, IsIn, Min, IsArray } from 'class-validator';
import { TicketStatus } from '../../enums/ticket.enum';
import { Direction } from '../../enums/common.enum';
import { availableTicketsSorts } from '../../config';

@InputType()
export class CreateTicketInput {
	@Field(() => String)
	@IsNotEmpty()
	@IsString()
	eventId: string;

	@Field(() => String)
	@IsNotEmpty()
	@IsString()
	memberId: string;

	@Field(() => Number)
	@IsNotEmpty()
	@IsNumber()
	ticketPrice: number;

	@Field(() => TicketStatus, { defaultValue: TicketStatus.PURCHASED })
	@IsEnum(TicketStatus)
	ticketStatus: TicketStatus;
}

@InputType()
class TSearch {
	@IsOptional()
	@Field(() => TicketStatus, { nullable: true })
	ticketStatus?: TicketStatus;
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
	@IsIn(availableTicketsSorts)
	@Field(() => String, { nullable: true })
	sort?: string;

	@IsOptional()
	@Field(() => Direction, { nullable: true })
	direction?: Direction;

	@IsNotEmpty()
	@Field(() => TSearch)
	search: TSearch;
}
