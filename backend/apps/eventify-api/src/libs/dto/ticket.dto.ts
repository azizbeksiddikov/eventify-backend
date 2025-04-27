import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { TicketStatus } from '../enums/common.enum';

@ObjectType()
export class Ticket {
	@Field()
	_id: string;

	@Field()
	eventId: string;

	@Field()
	memberId: string;

	@Field(() => TicketStatus)
	ticketStatus: TicketStatus;

	@Field()
	ticketPrice: number;

	@Field()
	createdAt: Date;

	@Field()
	updatedAt: Date;
}

@InputType()
export class CreateTicketDto {
	@Field()
	@IsString()
	@IsNotEmpty()
	eventId: string;

	@Field()
	@IsString()
	@IsNotEmpty()
	memberId: string;

	@Field()
	@IsNumber()
	ticketPrice: number;
}

@InputType()
export class UpdateTicketDto {
	@Field(() => TicketStatus)
	@IsEnum(TicketStatus)
	ticketStatus: TicketStatus;

	@Field({ nullable: true })
	@IsString()
	@IsOptional()
	notes?: string;
}
