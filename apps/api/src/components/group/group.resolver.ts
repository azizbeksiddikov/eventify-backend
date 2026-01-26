import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import type { ObjectId } from 'mongoose';

// ===== Nest Guards and Decorators =====
import { AuthGuard } from '../auth/guards/auth.guard';
import { WithoutGuard } from '../auth/guards/without.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

// ===== Enums =====
import { MemberType } from '../../libs/enums/member.enum';

// ===== DTOs =====
import { Group, Groups } from '../../libs/dto/group/group';
import { GroupInput, GroupsInquiry } from '../../libs/dto/group/group.input';
import { GroupUpdateInput } from '../../libs/dto/group/group.update';
import { GroupMember } from '../../libs/dto/groupMembers/groupMember';
import { GroupMemberUpdateInput } from '../../libs/dto/groupMembers/groupMember.update';

// ===== Config =====
import { shapeIntoMongoObjectId } from '../../libs/config';

// ===== Services =====
import { GroupService } from './group.service';
import { logger } from '../../libs/logger';

@Resolver(() => Group)
export class GroupResolver {
	constructor(private readonly groupService: GroupService) {}

	// ============== Group Management Methods ==============
	@Roles(MemberType.ORGANIZER)
	@UseGuards(RolesGuard)
	@Mutation(() => Group)
	public async createGroup(@Args('input') input: GroupInput, @AuthMember('_id') memberId: ObjectId): Promise<Group> {
		logger.debug('GroupResolver', 'Mutation: createGroup');
		return await this.groupService.createGroup(memberId, input);
	}

	@UseGuards(WithoutGuard)
	@Query(() => Group)
	public async getGroup(
		@Args('groupId') groupId: string,
		@AuthMember('_id') memberId: ObjectId | null,
	): Promise<Group> {
		logger.debug('GroupResolver', 'Query: getGroup');

		const targetId = shapeIntoMongoObjectId(groupId);
		return await this.groupService.getGroup(memberId, targetId);
	}

	@UseGuards(WithoutGuard)
	@Query(() => Groups)
	public async getGroups(
		@Args('input') input: GroupsInquiry,
		@AuthMember('_id') memberId: ObjectId | null,
	): Promise<Groups> {
		logger.debug('GroupResolver', 'Query: getGroups');
		return await this.groupService.getGroups(memberId, input);
	}

	@Roles(MemberType.ORGANIZER)
	@UseGuards(RolesGuard)
	@Query(() => [Group])
	public async getMyGroups(@AuthMember('_id') memberId: ObjectId): Promise<Group[]> {
		logger.debug('GroupResolver', 'Query: getMyGroups');
		return await this.groupService.getMyGroups(memberId);
	}

	@UseGuards(AuthGuard)
	@Query(() => [Group])
	public async getJoinedGroups(@AuthMember('_id') memberId: ObjectId): Promise<Group[]> {
		logger.debug('GroupResolver', 'Query: getJoinedGroups');
		return await this.groupService.getJoinedGroups(memberId);
	}

	@Roles(MemberType.ORGANIZER)
	@UseGuards(RolesGuard)
	@Mutation(() => Group)
	public async updateGroup(
		@Args('input') input: GroupUpdateInput,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Group> {
		logger.debug('GroupResolver', 'Mutation: updateGroup');
		input._id = shapeIntoMongoObjectId(input._id);
		return await this.groupService.updateGroup(memberId, input);
	}

	@Roles(MemberType.ORGANIZER)
	@UseGuards(RolesGuard)
	@Mutation(() => Group)
	public async deleteGroup(@Args('groupId') groupId: string, @AuthMember('_id') memberId: ObjectId): Promise<Group> {
		logger.debug('GroupResolver', 'Mutation: deleteGroup');
		const targetId = shapeIntoMongoObjectId(groupId);
		return await this.groupService.deleteGroup(memberId, targetId);
	}

	@UseGuards(AuthGuard)
	@Mutation(() => Group)
	public async likeTargetGroup(@Args('groupId') input: string, @AuthMember('_id') memberId: ObjectId): Promise<Group> {
		logger.debug('GroupResolver', 'Mutation: likeTargetGroup');
		const likeRefId = shapeIntoMongoObjectId(input);
		return await this.groupService.likeTargetGroup(memberId, likeRefId);
	}

	// ============== Group Member Methods ==============
	@UseGuards(AuthGuard)
	@Mutation(() => Group)
	public async joinTargetGroup(
		@Args('groupId') groupId: string,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Group> {
		logger.debug('GroupResolver', 'Mutation: joinTargetGroup');
		const targetId = shapeIntoMongoObjectId(groupId);
		return await this.groupService.joinTargetGroup(memberId, targetId);
	}

	@Roles(MemberType.ORGANIZER)
	@UseGuards(RolesGuard)
	@Mutation(() => GroupMember)
	public async updateGroupMemberRole(
		@Args('input') input: GroupMemberUpdateInput,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<GroupMember> {
		logger.debug('GroupResolver', 'Mutation: updateGroupMemberRole');
		input.groupId = shapeIntoMongoObjectId(input.groupId);
		input.targetMemberId = shapeIntoMongoObjectId(input.targetMemberId);
		return await this.groupService.updateGroupMemberRole(memberId, input);
	}

	@UseGuards(AuthGuard)
	@Mutation(() => Group)
	public async leaveTargetGroup(
		@Args('groupId') groupId: string,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Group> {
		logger.debug('GroupResolver', 'Mutation: leaveTargetGroup');
		const targetId = shapeIntoMongoObjectId(groupId);
		return await this.groupService.leaveTargetGroup(memberId, targetId);
	}

	// ============== Admin Methods ==============
	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Query(() => Groups)
	public async getAllGroupsByAdmin(@Args('input') input: GroupsInquiry): Promise<Groups> {
		logger.debug('GroupResolver', 'Query: getAllGroupsByAdmin');
		return await this.groupService.getAllGroupsByAdmin(input);
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => Group)
	public async updateGroupByAdmin(@Args('input') input: GroupUpdateInput): Promise<Group> {
		logger.debug('GroupResolver', 'Mutation: updateGroupByAdmin');
		return await this.groupService.updateGroupByAdmin(input);
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => Group)
	public async removeGroupByAdmin(@Args('groupId') groupId: string): Promise<Group> {
		logger.debug('GroupResolver', 'Mutation: removeGroupByAdmin');
		const targetId = shapeIntoMongoObjectId(groupId);
		return await this.groupService.removeGroupByAdmin(targetId);
	}
}
