import { ObjectId } from 'mongoose';
import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString } from 'class-validator';
import { GroupMemberRole } from '../../enums/group.enum';

@InputType()
export class GroupMemberInput {
	@Field(() => String)
	@IsNotEmpty()
	@IsString()
	groupId: ObjectId;

	@Field(() => String)
	@IsNotEmpty()
	@IsString()
	memberId: ObjectId;

	@Field(() => GroupMemberRole)
	@IsNotEmpty()
	groupMemberRole: GroupMemberRole;

	@Field(() => Date)
	@IsNotEmpty()
	joinDate: Date;
}
