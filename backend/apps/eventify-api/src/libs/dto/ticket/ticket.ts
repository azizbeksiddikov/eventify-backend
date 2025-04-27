import { Field, ObjectType } from '@nestjs/graphql';
import { TicketStatus } from '../../enums/ticket.enum';
import { TotalCounter } from '../member/member';
import { Event } from '../event/event';

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

	@Field(() => Event, { nullable: true })
	event?: Event;
}

@ObjectType()
export class Tickets {
	@Field(() => [Ticket])
	list: Ticket[];

	@Field(() => [TotalCounter], { nullable: true })
	metaCounter: TotalCounter[];
}
