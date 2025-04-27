import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString } from 'class-validator';
import { MemberRole } from '../../enums/group.enum';

@InputType()
export class CreateGroupMemberInput {
	@Field(() => String)
	@IsNotEmpty()
	@IsString()
	groupId: string;

	@Field(() => String)
	@IsNotEmpty()
	@IsString()
	memberId: string;

	@Field(() => MemberRole)
	@IsNotEmpty()
	memberRole: MemberRole;
}
