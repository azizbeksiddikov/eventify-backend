import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString } from 'class-validator';
import { GroupMemberRole } from '../../enums/group.enum';
import { ObjectId } from 'mongoose';

@InputType()
export class GroupMemberUpdateInput {
	@Field(() => String)
	@IsNotEmpty()
	@IsString()
	groupId: ObjectId;

	@Field(() => String)
	@IsNotEmpty()
	@IsString()
	targetMemberId: ObjectId;

	@Field(() => GroupMemberRole)
	@IsNotEmpty()
	groupMemberRole: GroupMemberRole;
}
