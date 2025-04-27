import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsNumber, IsEnum } from 'class-validator';
import { TicketStatus } from '../../enums/ticket.enum';

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
