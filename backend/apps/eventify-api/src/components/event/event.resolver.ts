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
import { EventInput, EventsInquiry } from '../../libs/dto/event/event.input';
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

	@UseGuards(AuthGuard)
	@Query(() => Event)
	public async getEvent(@Args('eventId') eventId: string): Promise<Event> {
		console.log('Query: getEvent');
		const targetId = shapeIntoMongoObjectId(eventId);
		return await this.eventService.getEvent(targetId);
	}

	@UseGuards(AuthGuard)
	@Query(() => Events)
	public async getEvents(@Args('input') input: EventsInquiry): Promise<Events> {
		console.log('Query: getEvents');
		return await this.eventService.getEvents(input);
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

	// Admin ONLY
	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => Event)
	public async deleteEventByAdmin(@Args('eventId') eventId: string): Promise<Event> {
		console.log('Mutation: deleteEventByAdmin');
		const targetId = shapeIntoMongoObjectId(eventId);
		return await this.eventService.deleteEventByAdmin(targetId);
	}
}
