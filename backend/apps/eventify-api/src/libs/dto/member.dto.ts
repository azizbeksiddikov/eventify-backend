import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { MemberStatus, MemberType } from '../enums/common.enum';

@ObjectType()
export class Member {
	@Field()
	_id: string;

	@Field()
	username: string;

	@Field()
	memberEmail: string;

	@Field()
	memberPhone: string;

	@Field()
	memberFullName: string;

	@Field(() => MemberType)
	memberType: MemberType;

	@Field()
	memberPoints: number;

	@Field({ nullable: true })
	memberDesc?: string;

	@Field({ nullable: true })
	memberImage?: string;

	@Field(() => MemberStatus)
	memberStatus: MemberStatus;

	@Field()
	emailVerified: boolean;

	@Field()
	memberLikes: number;

	@Field()
	memberFollowings: number;

	@Field()
	memberFollowers: number;

	@Field()
	memberViews: number;

	@Field()
	createdAt: Date;

	@Field()
	updatedAt: Date;
}

@InputType()
export class CreateMemberDto {
	@Field()
	@IsString()
	@IsNotEmpty()
	username: string;

	@Field()
	@IsEmail()
	@IsNotEmpty()
	memberEmail: string;

	@Field()
	@IsString()
	@IsNotEmpty()
	memberPhone: string;

	@Field()
	@IsString()
	@MinLength(8)
	memberPassword: string;

	@Field()
	@IsString()
	@IsNotEmpty()
	memberFullName: string;

	@Field(() => MemberType)
	@IsEnum(MemberType)
	memberType: MemberType;
}

@InputType()
export class UpdateMemberDto {
	@Field({ nullable: true })
	@IsString()
	@IsOptional()
	username?: string;

	@Field({ nullable: true })
	@IsEmail()
	@IsOptional()
	memberEmail?: string;

	@Field({ nullable: true })
	@IsString()
	@IsOptional()
	memberPhone?: string;

	@Field({ nullable: true })
	@IsString()
	@IsOptional()
	memberFullName?: string;

	@Field({ nullable: true })
	@IsString()
	@IsOptional()
	memberDesc?: string;

	@Field({ nullable: true })
	@IsString()
	@IsOptional()
	memberImage?: string;

	@Field(() => MemberStatus, { nullable: true })
	@IsEnum(MemberStatus)
	@IsOptional()
	memberStatus?: MemberStatus;
}
