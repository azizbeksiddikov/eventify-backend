import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GroupService } from './group.service';
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
import { UpdateGroupInput } from '../../libs/dto/group/group.update';
import { GroupMember } from '../../libs/dto/groupMembers/groupMember';
import { GroupMemberRole } from '../../libs/enums/group.enum';
import { Member } from '../../libs/dto/member/member';
import { UpdateGroupMemberInput } from '../../libs/dto/groupMembers/groupMember.update';

@Resolver(() => Group)
export class GroupResolver {
	constructor(private readonly groupService: GroupService) {}

	@Roles(MemberType.ORGANIZER)
	@UseGuards(RolesGuard)
	@Mutation(() => Group)
	public async createGroup(@Args('input') input: GroupInput, @AuthMember('_id') memberId: ObjectId): Promise<Group> {
		console.log('Mutation: createGroup');
		return await this.groupService.createGroup(input, memberId);
	}
}
