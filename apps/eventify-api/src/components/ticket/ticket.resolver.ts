import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ObjectId } from 'mongoose';

// ===== Configs =====
import { shapeIntoMongoObjectId } from '../../libs/config';

// ===== DTOs =====
import { Ticket, Tickets } from '../../libs/dto/ticket/ticket';
import { TicketInput, TicketInquiry } from '../../libs/dto/ticket/ticket.input';

// ===== Services =====
import { TicketService } from './ticket.service';

// ===== Guards & Decorators =====
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthMember } from '../auth/decorators/authMember.decorator';

@Resolver()
export class TicketResolver {
	constructor(private readonly ticketService: TicketService) {}

	@UseGuards(AuthGuard)
	@Mutation(() => Ticket)
	async createTicket(@Args('input') input: TicketInput, @AuthMember('_id') memberId: ObjectId): Promise<Ticket> {
		console.log('Mutation: createTicket');
		console.log('memberId:', memberId);
		return this.ticketService.createTicket(memberId, input);
	}

	@UseGuards(AuthGuard)
	@Mutation(() => Ticket)
	async cancelTicket(@Args('input') input: string, @AuthMember('_id') memberId: ObjectId): Promise<Ticket> {
		console.log('Mutation: cancelTicket');
		const ticketId = shapeIntoMongoObjectId(input);
		return this.ticketService.cancelTicket(memberId, ticketId);
	}

	@UseGuards(AuthGuard)
	@Query(() => Tickets)
	async getTickets(@AuthMember('_id') memberId: ObjectId, @Args('input') input: TicketInquiry): Promise<Tickets> {
		console.log('Query: getTickets');
		return this.ticketService.getMyTickets(memberId, input);
	}

	@UseGuards(AuthGuard)
	@Query(() => [Ticket])
	async getAllTicketsList(@AuthMember('_id') memberId: ObjectId): Promise<Ticket[]> {
		console.log('Query: getAllTicketsList');
		return this.ticketService.getAllTicketsList(memberId);
	}
}
