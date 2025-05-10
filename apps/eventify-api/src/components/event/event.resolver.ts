import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { ObjectId } from 'mongoose';
import { MemberType } from '../../libs/enums/member.enum';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { WithoutGuard } from '../auth/guards/without.guard';
import { Event, Events, EventsByCategory } from '../../libs/dto/event/event';
import {
	EventInput,
	EventsByCategoryInquiry,
	EventsInquiry,
	OrdinaryEventInquiry,
} from '../../libs/dto/event/event.input';
import { EventUpdateInput } from '../../libs/dto/event/event.update';
import { EventService } from './event.service';

@Resolver(() => Event)
export class EventResolver {
	constructor(private readonly eventService: EventService) {}

	@Roles(MemberType.ORGANIZER)
	@UseGuards(RolesGuard)
	@Mutation(() => Event)
	public async createEvent(@Args('input') input: EventInput, @AuthMember('_id') memberId: ObjectId): Promise<Event> {
		console.log('Mutation: createEvent');
		return await this.eventService.createEvent(memberId, input);
	}

	@UseGuards(WithoutGuard)
	@Query(() => Event)
	public async getEvent(
		@Args('eventId') eventId: string,
		@AuthMember('_id') memberId: ObjectId | null,
	): Promise<Event> {
		console.log('Query: getEvent');
		const targetId = shapeIntoMongoObjectId(eventId);

		return await this.eventService.getEvent(memberId, targetId);
	}

	@UseGuards(WithoutGuard)
	@Query(() => Events)
	public async getEvents(
		@Args('input') input: EventsInquiry,
		@AuthMember('_id') memberId: ObjectId | null,
	): Promise<Events> {
		console.log('Query: getEvents');
		return await this.eventService.getEvents(memberId, input);
	}

	@UseGuards(WithoutGuard)
	@Query(() => EventsByCategory)
	public async getEventsByCategory(
		@Args('input') input: EventsByCategoryInquiry,
		@AuthMember('_id') memberId: ObjectId | null,
	): Promise<EventsByCategory> {
		console.log('Query: getEventsByCategory');
		return await this.eventService.getEventsByCategory(memberId, input);
	}

	@UseGuards(AuthGuard)
	@Query(() => Events)
	public async getFavorites(
		@Args('input') input: OrdinaryEventInquiry,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Events> {
		console.log('Query: getFavorites');

		return await this.eventService.getFavorites(memberId, input);
	}

	@UseGuards(AuthGuard)
	@Query(() => Events)
	public async getVisited(
		@Args('input') input: OrdinaryEventInquiry,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Events> {
		console.log('Query: getVisited');

		return await this.eventService.getVisited(memberId, input);
	}

	@Roles(MemberType.ORGANIZER)
	@UseGuards(RolesGuard)
	@Mutation(() => Event)
	public async updateEventByOrganizer(
		@Args('input') input: EventUpdateInput,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Event> {
		console.log('Mutation: updateEvent');
		input._id = shapeIntoMongoObjectId(input._id);
		return await this.eventService.updateEventByOrganizer(memberId, input);
	}

	@UseGuards(AuthGuard)
	@Mutation(() => Event)
	public async likeTargetEvent(@Args('eventId') input: string, @AuthMember('_id') memberId: ObjectId): Promise<Event> {
		console.log('Mutation: likeTargetEvent');
		const likeRefId = shapeIntoMongoObjectId(input);
		return await this.eventService.likeTargetEvent(memberId, likeRefId);
	}

	// ============== Admin Methods ==============
	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Query(() => Events)
	public async getAllEventsByAdmin(@Args('input') input: EventsInquiry): Promise<Events> {
		console.log('Query: getAllEventsByAdmin');
		return await this.eventService.getAllEventsByAdmin(input);
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => Event)
	public async updateEventByAdmin(@Args('input') input: EventUpdateInput): Promise<Event> {
		console.log('Mutation: updateEventByAdmin');
		return await this.eventService.updateEventByAdmin(input);
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => Event)
	public async removeEventByAdmin(@Args('eventId') eventId: string): Promise<Event> {
		console.log('Mutation: removeEventByAdmin');
		const targetId = shapeIntoMongoObjectId(eventId);
		return await this.eventService.removeEventByAdmin(targetId);
	}
}
