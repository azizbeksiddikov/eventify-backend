import { Field, InputType, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsNumber, IsEnum, IsOptional, IsIn, Min, IsArray } from 'class-validator';
import { TicketStatus } from '../../enums/ticket.enum';
import { Direction } from '../../enums/common.enum';
import { availableTicketsSorts } from '../../config';
import { ObjectId } from 'mongoose';

// ============== Ticket Creation Input ==============
@InputType()
export class TicketInput {
	// ===== References =====
	@Field(() => String)
	@IsNotEmpty()
	@IsString()
	eventId: ObjectId;

	@Field(() => String)
	@IsNotEmpty()
	@IsString()
	memberId: ObjectId;

	// ===== Pricing =====
	@Field(() => Number)
	@IsNotEmpty()
	@IsNumber()
	ticketPrice: number;

	// ===== Type and Status =====
	@Field(() => TicketStatus, { defaultValue: TicketStatus.PURCHASED })
	@IsEnum(TicketStatus)
	ticketStatus: TicketStatus;
}

// ============== Search Inputs ==============
@InputType()
class TISearch {
	@IsOptional()
	@Field(() => TicketStatus, { nullable: true })
	ticketStatus?: TicketStatus;
}

// ============== Inquiry Inputs ==============
@InputType()
export class TicketInquiry {
	// ===== Pagination =====
	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	page: number;

	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	limit: number;

	// ===== Sorting =====
	@IsOptional()
	@IsIn(availableTicketsSorts)
	@Field(() => String, { nullable: true })
	sort?: string;

	@IsOptional()
	@Field(() => Direction, { nullable: true })
	direction?: Direction;

	// ===== Search =====
	@IsNotEmpty()
	@Field(() => TISearch)
	search: TISearch;
}
