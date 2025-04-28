import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsString, IsEmail, IsNotEmpty, IsBoolean, IsEnum } from 'class-validator';
import { MemberType, MemberStatus } from '../../enums/member.enum';
import { ObjectId } from 'mongoose';

// ============== Member Update Input ==============
@InputType()
export class MemberUpdateInput {
	// ===== Identification =====
	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	_id?: ObjectId;

	// ===== Authentication Fields =====
	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	username?: string;

	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsEmail()
	memberEmail?: string;

	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	memberPassword?: string;

	// ===== Profile Information =====
	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	memberPhone?: string;

	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	memberFullName?: string;

	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	memberDesc?: string;

	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
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
}

// ============== Password Update Input ==============
@InputType()
export class PasswordUpdateInput {
	@Field(() => String)
	@IsNotEmpty()
	@IsString()
	currentPassword: string;

	@Field(() => String)
	@IsNotEmpty()
	@IsString()
	newPassword: string;
}
