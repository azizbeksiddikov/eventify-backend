import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString } from 'class-validator';
import { GroupMemberRole } from '../../enums/group.enum';
import { ObjectId } from 'mongoose';

@InputType()
export class GroupMemberUpdateInput {
	// ===== Basic Information =====
	@Field(() => String)
	@IsNotEmpty()
	@IsString()
	groupId: ObjectId;

	@Field(() => String)
	@IsNotEmpty()
	@IsString()
	targetMemberId: ObjectId;

	// ===== Type and Status =====
	@Field(() => GroupMemberRole)
	@IsNotEmpty()
	groupMemberRole: GroupMemberRole;
}
