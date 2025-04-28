import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { ObjectId } from 'mongoose';
import { MemberType } from '../../libs/enums/member.enum';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { Group, Groups } from '../../libs/dto/group/group';
import { GroupInput, GroupsInquiry } from '../../libs/dto/group/group.input';
import { GroupUpdateInput } from '../../libs/dto/group/group.update';
import { GroupMember } from '../../libs/dto/groupMembers/groupMember';
import { GroupMemberRole } from '../../libs/enums/group.enum';
import { Member } from '../../libs/dto/member/member';
import { GroupMemberUpdateInput } from '../../libs/dto/groupMembers/groupMember.update';
import { Message } from '../../libs/enums/common.enum';
import { WithoutGuard } from '../auth/guards/without.guard';
import { Event, Events } from '../../libs/dto/event/event';
import { EventInput, EventsInquiry, OrdinaryEventInquiry } from '../../libs/dto/event/event.input';
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

	@UseGuards(AuthGuard)
	@Query(() => Events)
	public async getEvents(@Args('input') input: EventsInquiry): Promise<Events> {
		console.log('Query: getEvents');
		return await this.eventService.getEvents(input);
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
	public async updateEvent(
		@Args('input') input: EventUpdateInput,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Event> {
		console.log('Mutation: updateEvent');
		input._id = shapeIntoMongoObjectId(input._id);
		return await this.eventService.updateEvent(memberId, input);
	}

	@UseGuards(AuthGuard)
	@Query(() => [Event])
	public async getMyEvents(@AuthMember() member: Member): Promise<Event[]> {
		console.log('Query: getMyEvents');
		return await this.eventService.getMyEvents(member);
	}

	@UseGuards(AuthGuard)
	@Mutation(() => Event)
	public async attendEvent(@Args('eventId') eventId: string, @AuthMember('_id') memberId: ObjectId): Promise<Event> {
		console.log('Mutation: attendEvent');
		const targetId = shapeIntoMongoObjectId(eventId);

		return await this.eventService.attendEvent(memberId, targetId);
	}

	@UseGuards(AuthGuard)
	@Mutation(() => Event)
	public async withdrawEvent(@Args('eventId') eventId: string, @AuthMember('_id') memberId: ObjectId): Promise<Event> {
		console.log('Mutation: withdrawEvent');
		const targetId = shapeIntoMongoObjectId(eventId);

		return await this.eventService.withdrawEvent(memberId, targetId);
	}
	@UseGuards(AuthGuard)
	@Mutation(() => Event)
	public async likeTargetEvent(@Args('eventId') input: string, @AuthMember('_id') memberId: ObjectId): Promise<Event> {
		console.log('Mutation: likeTargetEvent');
		const likeRefId = shapeIntoMongoObjectId(input);
		return await this.eventService.likeTargetEvent(memberId, likeRefId);
	}

	// ADMIN ONLY
	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => Event)
	public async deleteEventByAdmin(@Args('eventId') eventId: string): Promise<Event> {
		console.log('Mutation: deleteEventByAdmin');
		const targetId = shapeIntoMongoObjectId(eventId);
		return await this.eventService.deleteEventByAdmin(targetId);
	}
}
