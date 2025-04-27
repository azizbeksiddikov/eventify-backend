import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsEmail, IsOptional } from 'class-validator';
import { MemberType } from '../../enums/member.enum';

@InputType()
export class CreateMemberInput {
	@Field(() => String)
	@IsNotEmpty()
	username: string;

	@Field(() => String)
	@IsNotEmpty()
	@IsEmail()
	memberEmail: string;

	@Field(() => String, { nullable: true })
	@IsOptional()
	memberPhone?: string;

	@Field(() => String)
	@IsNotEmpty()
	memberPassword: string;

	@Field(() => String)
	@IsNotEmpty()
	memberFullName: string;

	@Field(() => MemberType, { defaultValue: MemberType.USER })
	@IsOptional()
	memberType: MemberType;
}
