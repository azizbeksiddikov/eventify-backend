import { Field, ObjectType } from '@nestjs/graphql';
import { TicketStatus } from '../../enums/ticket.enum';

@ObjectType()
export class Ticket {
	@Field(() => String)
	_id: string;

	@Field(() => String)
	eventId: string;

	@Field(() => String)
	memberId: string;

	@Field(() => TicketStatus)
	ticketStatus: TicketStatus;

	@Field(() => Number)
	ticketPrice: number;

	@Field(() => Date)
	createdAt: Date;

	@Field(() => Date)
	updatedAt: Date;
}
