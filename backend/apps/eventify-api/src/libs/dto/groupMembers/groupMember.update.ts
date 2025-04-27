import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsNotEmpty } from 'class-validator';
import { GroupMemberRole } from '../../enums/group.enum';
import { ObjectId } from 'mongoose';

@InputType()
export class UpdateGroupMemberInput {
	@IsNotEmpty()
	@Field(() => String)
	_id: ObjectId;

	@Field(() => GroupMemberRole, { nullable: true })
	@IsOptional()
	groupMemberRole?: GroupMemberRole;
}
