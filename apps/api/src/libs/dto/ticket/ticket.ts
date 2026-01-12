import { Field, ObjectType } from '@nestjs/graphql';
import { TicketStatus } from '../../enums/ticket.enum';
import { TotalCounter } from '../member/member';
import { Event } from '../event/event';
import type { ObjectId } from 'mongoose';

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
	// Currency-related (external): Price in the event's currency (e.g., 10.00 USD)
	@Field(() => Number)
	ticketPrice: number;

	// Currency-related (external): Currency code (e.g., "USD", "EUR")
	@Field(() => String)
	ticketCurrency: string;

	@Field(() => Number)
	ticketQuantity: number;

	// Internal points system: Total points deducted from user's account
	// Calculated as: eventPrice * ticketQuantity * exchangeRate
	@Field(() => Number)
	totalPrice: number;

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
