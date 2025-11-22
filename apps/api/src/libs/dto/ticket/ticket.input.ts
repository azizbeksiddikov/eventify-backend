import { Field, InputType, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsNumber, IsEnum, IsOptional, IsIn, Min, IsArray } from 'class-validator';
import { TicketStatus } from '../../enums/ticket.enum';
import { Direction } from '../../enums/common.enum';
import type { ObjectId } from 'mongoose';

// ============== Ticket Creation Input ==============
@InputType()
export class TicketInput {
	// ===== References =====
	@Field(() => String)
	@IsNotEmpty()
	eventId: ObjectId;

	// ===== Pricing =====
	@Field(() => Number)
	@IsNotEmpty()
	ticketPrice: number;

	@Field(() => Number)
	@IsNotEmpty()
	ticketQuantity: number;

	@Field(() => Number)
	@IsNotEmpty()
	totalPrice: number;
}

// ============== Search Inputs ==============
@InputType()
class TISearch {
	@IsOptional()
	@Field(() => TicketStatus, { nullable: true })
	ticketStatus?: TicketStatus;

	@IsOptional()
	@Field(() => String, { nullable: true })
	eventId?: ObjectId;
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
