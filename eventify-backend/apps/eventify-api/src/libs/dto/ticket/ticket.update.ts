import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsString, IsNumber, IsEnum, IsNotEmpty } from 'class-validator';
import { TicketStatus } from '../../enums/ticket.enum';
import { ObjectId } from 'mongoose';

@InputType()
export class UpdateTicketInput {
	// ===== Identification =====
	@IsNotEmpty()
	@Field(() => String)
	_id: ObjectId;

	// ===== References =====
	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	eventId?: ObjectId;

	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	memberId?: ObjectId;

	// ===== Pricing =====
	@Field(() => Number, { nullable: true })
	@IsOptional()
	@IsNumber()
	ticketPrice?: number;

	// ===== Type and Status =====
	@Field(() => TicketStatus, { nullable: true })
	@IsOptional()
	@IsEnum(TicketStatus)
	ticketStatus?: TicketStatus;
}
