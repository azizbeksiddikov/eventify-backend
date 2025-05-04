import { Field, InputType, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, Min, IsIn, IsString, IsArray, IsNumber, IsEnum } from 'class-validator';
import { MemberStatus, MemberType } from '../../enums/member.enum';
import { Direction } from '../../enums/common.enum';

// ============== Authentication Inputs ==============
@InputType()
export class MemberInput {
	// ===== Required Fields =====
	@Field(() => String)
	@IsNotEmpty()
	@IsString()
	username: string;

	@Field(() => String)
	@IsNotEmpty()
	@IsString()
	memberEmail: string;

	@Field(() => String)
	@IsNotEmpty()
	@IsString()
	memberPassword: string;

	@Field(() => String)
	@IsNotEmpty()
	@IsString()
	memberFullName: string;

	// ===== Optional Fields =====
	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	memberPhone?: string;

	@Field(() => MemberType, { defaultValue: MemberType.USER })
	@IsOptional()
	@IsEnum(MemberType)
	memberType?: MemberType;
}

@InputType()
export class LoginInput {
	@Field(() => String)
	@IsNotEmpty()
	@IsString()
	username: string;

	@Field(() => String)
	@IsNotEmpty()
	@IsString()
	memberPassword: string;
}

// ============== Search Inputs ==============
@InputType()
class OISearch {
	@IsOptional()
	@Field(() => String, { nullable: true })
	text?: string;
}

@InputType()
class MISearch {
	@IsOptional()
	@Field(() => MemberStatus, { nullable: true })
	memberStatus?: MemberStatus;

	@IsOptional()
	@Field(() => MemberType, { nullable: true })
	memberType?: MemberType;

	@IsOptional()
	@Field(() => String, { nullable: true })
	text?: string;
}

// ============== Inquiry Inputs ==============
@InputType()
export class OrganizersInquiry {
	// ===== Pagination =====
	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	page: number;

	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	limit: number;

	// ===== Sorting =====
	@IsOptional()
	@Field(() => String, { nullable: true })
	sort?: string;

	@IsOptional()
	@Field(() => Direction, { nullable: true })
	direction?: Direction;

	// ===== Search =====
	@IsNotEmpty()
	@Field(() => OISearch)
	search: OISearch;
}

@InputType()
export class MembersInquiry {
	// ===== Pagination =====
	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	page: number;

	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	limit: number;

	// ===== Sorting =====
	@IsOptional()
	@Field(() => String, { nullable: true })
	sort?: string;

	@IsOptional()
	@Field(() => Direction, { nullable: true })
	direction?: Direction;

	// ===== Search =====
	@IsNotEmpty()
	@Field(() => MISearch)
	search: MISearch;
}
