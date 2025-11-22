import { Field, ObjectType } from '@nestjs/graphql';
import { GroupMemberRole } from '../../enums/group.enum';
import type { ObjectId } from 'mongoose';

@ObjectType()
export class GroupMember {
	// ===== Basic Information =====
	@Field(() => String)
	_id: ObjectId;

	@Field(() => String)
	groupId: ObjectId;

	@Field(() => String)
	memberId: ObjectId;

	// ===== Type and Status =====
	@Field(() => GroupMemberRole)
	groupMemberRole: GroupMemberRole;

	// ===== Timestamps =====
	@Field(() => Date)
	joinDate: Date;

	@Field(() => Date)
	createdAt: Date;

	@Field(() => Date)
	updatedAt: Date;
}
