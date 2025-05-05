import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsNotEmpty, IsBoolean, IsEnum } from 'class-validator';
import { MemberType, MemberStatus } from '../../enums/member.enum';
import { ObjectId } from 'mongoose';

// ============== Member Update Input ==============
@InputType()
export class MemberUpdateInput {
	// ===== Authentication Fields =====
	@Field(() => String, { nullable: true })
	@IsOptional()
	username?: string;

	@Field(() => String, { nullable: true })
	@IsOptional()
	memberEmail?: string;

	@Field(() => String, { nullable: true })
	@IsOptional()
	memberPassword?: string;

	// ===== Profile Information =====
	@Field(() => String, { nullable: true })
	@IsOptional()
	memberPhone?: string;

	@Field(() => String, { nullable: true })
	@IsOptional()
	memberFullName?: string;

	@Field(() => String, { nullable: true })
	@IsOptional()
	memberDesc?: string;

	@Field(() => String, { nullable: true })
	@IsOptional()
	memberImage?: string;

	// ===== Status Fields =====
	@Field(() => MemberStatus, { nullable: true })
	@IsOptional()
	@IsEnum(MemberStatus)
	memberStatus?: MemberStatus;

	@Field(() => Boolean, { nullable: true })
	@IsOptional()
	@IsBoolean()
	emailVerified?: boolean;

	// ===== Admin Fields =====
	@Field(() => String, { nullable: true })
	@IsOptional()
	_id?: ObjectId;

	@Field(() => String, { nullable: true })
	@IsOptional()
	memberType?: MemberType;

	@Field(() => Number, { nullable: true })
	@IsOptional()
	memberPoints?: number;
}

// ============== Password Update Input ==============
@InputType()
export class PasswordUpdateInput {
	@Field(() => String)
	@IsNotEmpty()
	currentPassword: string;

	@Field(() => String)
	@IsNotEmpty()
	newPassword: string;
}
