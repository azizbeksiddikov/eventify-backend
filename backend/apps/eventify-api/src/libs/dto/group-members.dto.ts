import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { MemberRole } from '../enums/common.enum';

@ObjectType()
export class GroupMember {
	@Field()
	_id: string;

	@Field()
	groupId: string;

	@Field()
	memberId: string;

	@Field(() => MemberRole)
	memberRole: MemberRole;

	@Field()
	joinDate: Date;

	@Field()
	createdAt: Date;

	@Field()
	updatedAt: Date;
}

@InputType()
export class CreateGroupMemberDto {
	@Field()
	@IsString()
	@IsNotEmpty()
	groupId: string;

	@Field()
	@IsString()
	@IsNotEmpty()
	memberId: string;

	@Field(() => MemberRole)
	@IsEnum(MemberRole)
	memberRole: MemberRole;
}

@InputType()
export class UpdateGroupMemberDto {
	@Field(() => MemberRole)
	@IsEnum(MemberRole)
	memberRole: MemberRole;
}
