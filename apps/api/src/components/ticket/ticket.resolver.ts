import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import type { ObjectId } from 'mongoose';

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
import { logger } from '../../libs/logger';

@Resolver()
export class TicketResolver {
	constructor(private readonly ticketService: TicketService) {}

	@UseGuards(AuthGuard)
	@Mutation(() => Ticket)
	async createTicket(@Args('input') input: TicketInput, @AuthMember('_id') memberId: ObjectId): Promise<Ticket> {
		logger.debug('TicketResolver', 'Mutation: createTicket');
		return this.ticketService.createTicket(memberId, input);
	}

	@UseGuards(AuthGuard)
	@Mutation(() => Ticket)
	async cancelTicket(@Args('input') input: string, @AuthMember('_id') memberId: ObjectId): Promise<Ticket> {
		logger.debug('TicketResolver', 'Mutation: cancelTicket');
		const ticketId = shapeIntoMongoObjectId(input);
		return this.ticketService.cancelTicket(memberId, ticketId);
	}

	@UseGuards(AuthGuard)
	@Query(() => Tickets)
	async getMyTickets(@AuthMember('_id') memberId: ObjectId, @Args('input') input: TicketInquiry): Promise<Tickets> {
		logger.debug('TicketResolver', 'Query: getMyTickets');
		return this.ticketService.getMyTickets(memberId, input);
	}

	@UseGuards(AuthGuard)
	@Query(() => [Ticket])
	async getAllTicketsList(@AuthMember('_id') memberId: ObjectId): Promise<Ticket[]> {
		logger.debug('TicketResolver', 'Query: getAllTicketsList');
		return this.ticketService.getAllTicketsList(memberId);
	}
}
