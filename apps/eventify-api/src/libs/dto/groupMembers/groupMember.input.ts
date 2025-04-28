import { ObjectId } from 'mongoose';
import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString } from 'class-validator';
import { GroupMemberRole } from '../../enums/group.enum';

@InputType()
export class GroupMemberInput {
	// ===== Basic Information =====
	@Field(() => String)
	@IsNotEmpty()
	@IsString()
	groupId: ObjectId;

	@Field(() => String)
	@IsNotEmpty()
	@IsString()
	memberId: ObjectId;

	// ===== Type and Status =====
	@Field(() => GroupMemberRole)
	@IsNotEmpty()
	groupMemberRole: GroupMemberRole;

	// ===== Timestamps =====
	@Field(() => Date)
	@IsNotEmpty()
	joinDate: Date;
}
