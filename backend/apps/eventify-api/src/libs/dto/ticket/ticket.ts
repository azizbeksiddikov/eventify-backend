import { Field, ObjectType } from '@nestjs/graphql';
import { TicketStatus } from '../../enums/ticket.enum';
import { TotalCounter } from '../member/member';
import { Event } from '../event/event';
import { ObjectId } from 'mongoose';

@ObjectType()
export class Ticket {
	// ===== Basic Information =====
	@Field(() => String)
	_id: ObjectId;

	// ===== References =====
	@Field(() => String)
	eventId: ObjectId;

	@Field(() => String)
	memberId: ObjectId;

	// ===== Type and Status =====
	@Field(() => TicketStatus)
	ticketStatus: TicketStatus;

	// ===== Pricing =====
	@Field(() => Number)
	ticketPrice: number;

	// ===== Timestamps =====
	@Field(() => Date)
	createdAt: Date;

	@Field(() => Date)
	updatedAt: Date;

	// ===== Aggregated Fields =====
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
