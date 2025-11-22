import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsString, IsNumber, IsEnum, IsNotEmpty } from 'class-validator';
import { TicketStatus } from '../../enums/ticket.enum';
import type { ObjectId } from 'mongoose';

@InputType()
export class UpdateTicketInput {
	// ===== Identification =====
	@IsNotEmpty()
	@Field(() => String)
	_id: ObjectId;

	// ===== Type and Status =====
	@Field(() => TicketStatus, { nullable: true })
	@IsOptional()
	@IsEnum(TicketStatus)
	ticketStatus?: TicketStatus;
}
