import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import type { ObjectId } from 'mongoose';

// ===== Guards & Decorators =====
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthMember } from '../auth/decorators/authMember.decorator';

// ===== Configs =====
import { shapeIntoMongoObjectId } from '../../libs/config';

// ===== DTOs =====
import { EventRecurrence } from '../../libs/dto/eventRecurrence/eventRecurrence';
import { EventRecurrenceInput, EventRecurrenceUpdateInput } from '../../libs/dto/eventRecurrence/eventRecurrence.input';

// ===== Service =====
import { EventRecurrenceService } from './eventRecurrence.service';
import { logger } from '../../libs/logger';

@Resolver(() => EventRecurrence)
export class EventRecurrenceResolver {
	constructor(private readonly eventRecurrenceService: EventRecurrenceService) {}

	@UseGuards(AuthGuard)
	@Mutation(() => EventRecurrence)
	public async createRecurringEvent(
		@Args('input') input: EventRecurrenceInput,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<EventRecurrence> {
		logger.debug('EventRecurrenceResolver', 'Mutation: createRecurringEvent');
		return await this.eventRecurrenceService.createRecurringEvent(memberId, input);
	}

	@UseGuards(AuthGuard)
	@Mutation(() => EventRecurrence)
	public async updateRecurringEvent(
		@Args('input') input: EventRecurrenceUpdateInput,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<EventRecurrence> {
		logger.debug('EventRecurrenceResolver', 'Mutation: updateRecurringEvent');
		return await this.eventRecurrenceService.updateRecurringEvent(memberId, input);
	}

	@UseGuards(AuthGuard)
	@Mutation(() => EventRecurrence)
	public async cancelRecurringSeries(
		@Args('recurrenceId') recurrenceId: string,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<EventRecurrence> {
		logger.debug('EventRecurrenceResolver', 'Mutation: cancelRecurringSeries');
		return await this.eventRecurrenceService.cancelRecurringSeries(memberId, shapeIntoMongoObjectId(recurrenceId));
	}

	@UseGuards(AuthGuard)
	@Query(() => EventRecurrence)
	public async getRecurrence(@Args('recurrenceId') recurrenceId: string): Promise<EventRecurrence> {
		logger.debug('EventRecurrenceResolver', 'Query: getRecurrence');
		return await this.eventRecurrenceService.getRecurrence(shapeIntoMongoObjectId(recurrenceId));
	}
}
