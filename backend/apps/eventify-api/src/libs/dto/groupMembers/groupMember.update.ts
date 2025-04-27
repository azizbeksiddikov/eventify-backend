import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsNotEmpty } from 'class-validator';
import { MemberRole } from '../../enums/group.enum';
import { ObjectId } from 'mongoose';

@InputType()
export class UpdateGroupMemberInput {
	@IsNotEmpty()
	@Field(() => String)
	_id: ObjectId;

	@Field(() => MemberRole, { nullable: true })
	@IsOptional()
	memberRole?: MemberRole;
}
