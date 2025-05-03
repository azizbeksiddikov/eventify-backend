import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ObjectId } from 'mongoose';

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
import { Member } from '../../libs/dto/member/member';

@Resolver(() => Group)
export class GroupResolver {
	constructor(private readonly groupService: GroupService) {}

	// ============== Group Management Methods ==============
	@Roles(MemberType.ORGANIZER)
	@UseGuards(RolesGuard)
	@Mutation(() => Group)
	public async createGroup(@Args('input') input: GroupInput, @AuthMember('_id') memberId: ObjectId): Promise<Group> {
		console.log('Mutation: createGroup');
		return await this.groupService.createGroup(memberId, input);
	}

	@UseGuards(WithoutGuard)
	@Query(() => Group)
	public async getGroup(
		@Args('groupId') groupId: string,
		@AuthMember('_id') memberId: ObjectId | null,
	): Promise<Group> {
		console.log('Query: getGroup');
		const targetId = shapeIntoMongoObjectId(groupId);
		return await this.groupService.getGroup(memberId, targetId);
	}

	@UseGuards(WithoutGuard)
	@Query(() => Groups)
	public async getGroups(
		@Args('input') input: GroupsInquiry,
		@AuthMember('_id') memberId: ObjectId | null,
	): Promise<Groups> {
		console.log('Query: getGroups');
		return await this.groupService.getGroups(memberId, input);
	}

	@Roles(MemberType.ORGANIZER)
	@UseGuards(RolesGuard)
	@Query(() => [Group])
	public async getMyGroups(@AuthMember('_id') memberId: ObjectId): Promise<Group[]> {
		console.log('Query: getMyGroups');
		return await this.groupService.getMyGroups(memberId);
	}

	@Roles(MemberType.ORGANIZER)
	@UseGuards(RolesGuard)
	@Mutation(() => Group)
	public async updateGroup(
		@Args('input') input: GroupUpdateInput,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Group> {
		console.log('Mutation: updateGroup');
		input._id = shapeIntoMongoObjectId(input._id);
		return await this.groupService.updateGroup(memberId, input);
	}

	@Roles(MemberType.ORGANIZER)
	@UseGuards(RolesGuard)
	@Mutation(() => Group)
	public async deleteGroup(@Args('groupId') groupId: string, @AuthMember('_id') memberId: ObjectId): Promise<Group> {
		console.log('Mutation: deleteGroup');
		const targetId = shapeIntoMongoObjectId(groupId);
		return await this.groupService.deleteGroup(memberId, targetId);
	}

	@UseGuards(AuthGuard)
	@Mutation(() => Group)
	public async likeTargetGroup(@Args('groupId') input: string, @AuthMember('_id') memberId: ObjectId): Promise<Group> {
		console.log('Mutation: likeTargetGroup');
		const likeRefId = shapeIntoMongoObjectId(input);
		return await this.groupService.likeTargetGroup(memberId, likeRefId);
	}

	// ============== Group Member Methods ==============
	@UseGuards(AuthGuard)
	@Mutation(() => GroupMember)
	public async joinGroup(
		@Args('groupId') groupId: string,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<GroupMember> {
		console.log('Mutation: joinGroup');
		const targetId = shapeIntoMongoObjectId(groupId);
		return await this.groupService.joinGroup(memberId, targetId);
	}

	@Roles(MemberType.ORGANIZER)
	@UseGuards(RolesGuard)
	@Mutation(() => GroupMember)
	public async updateGroupMemberRole(
		@Args('input') input: GroupMemberUpdateInput,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<GroupMember> {
		console.log('Mutation: updateGroupMemberRole');
		input.groupId = shapeIntoMongoObjectId(input.groupId);
		input.targetMemberId = shapeIntoMongoObjectId(input.targetMemberId);
		return await this.groupService.updateGroupMemberRole(memberId, input);
	}

	@UseGuards(AuthGuard)
	@Mutation(() => GroupMember)
	public async leaveGroup(
		@Args('groupId') groupId: string,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<GroupMember> {
		console.log('Mutation: leaveGroup');
		const targetId = shapeIntoMongoObjectId(groupId);
		return await this.groupService.leaveGroup(memberId, targetId);
	}
}
