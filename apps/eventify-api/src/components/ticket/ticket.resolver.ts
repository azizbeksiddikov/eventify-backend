import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { TicketService } from './ticket.service';
import { Ticket } from '../../libs/dto/ticket/ticket';
import { TicketInput } from '../../libs/dto/ticket/ticket.input';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { ObjectId } from 'mongoose';
import { AuthGuard } from '../auth/guards/auth.guard';

@Resolver()
export class TicketResolver {
	constructor(private readonly ticketService: TicketService) {}

	@UseGuards(AuthGuard)
	@Mutation(() => Ticket)
	async createTicket(@Args('input') input: TicketInput, @AuthMember('_id') memberId: ObjectId): Promise<Ticket> {
		return this.ticketService.createTicket(memberId, input);
	}

	@UseGuards(AuthGuard)
	@Mutation(() => Ticket)
	async cancelTicket(@Args('input') input: string, @AuthMember('_id') memberId: ObjectId): Promise<Ticket> {
		const ticketId = shapeIntoMongoObjectId(input);
		return this.ticketService.cancelTicket(memberId, ticketId);
	}
}
