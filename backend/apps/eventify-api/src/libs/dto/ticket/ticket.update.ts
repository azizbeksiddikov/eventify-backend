import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsString, IsNumber, IsEnum, IsNotEmpty } from 'class-validator';
import { TicketStatus } from '../../enums/ticket.enum';
import { ObjectId } from 'mongoose';

@InputType()
export class UpdateTicketInput {
	@IsNotEmpty()
	@Field(() => String)
	_id: ObjectId;

	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	eventId?: string;

	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	memberId?: string;

	@Field(() => Number, { nullable: true })
	@IsOptional()
	@IsNumber()
	ticketPrice?: number;

	@Field(() => TicketStatus, { nullable: true })
	@IsOptional()
	@IsEnum(TicketStatus)
	ticketStatus?: TicketStatus;
}
