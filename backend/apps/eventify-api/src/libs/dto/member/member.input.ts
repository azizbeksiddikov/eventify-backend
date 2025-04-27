import { Field, InputType, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, Min, IsIn, IsString, IsArray, IsNumber } from 'class-validator';
import { MemberStatus, MemberType } from '../../enums/member.enum';
import { Direction } from '../../enums/common.enum';
import { availableMembersSorts, availableOrganizersSorts } from '../../config';

@InputType()
export class MemberInput {
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

	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	memberPhone?: string;

	@Field(() => MemberType, { defaultValue: MemberType.USER })
	@IsOptional()
	memberType: MemberType;
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

// Organizers Inquiry Search
@InputType()
class OISearch {
	@IsOptional()
	@Field(() => String, { nullable: true })
	text?: string;
}

@InputType()
export class OrganizersInquiry {
	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	page: number;

	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	limit: number;

	@IsOptional()
	@IsIn(availableOrganizersSorts)
	@Field(() => String, { nullable: true })
	sort?: string;

	@IsOptional()
	@Field(() => Direction, { nullable: true })
	direction?: Direction;

	@IsNotEmpty()
	@Field(() => OISearch)
	search: OISearch;
}

// Member Inquiry Search
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

@InputType()
export class MembersInquiry {
	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	page: number;

	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	limit: number;

	@IsOptional()
	@IsIn(availableMembersSorts)
	@Field(() => String, { nullable: true })
	sort?: string;

	@IsOptional()
	@Field(() => Direction, { nullable: true })
	direction?: Direction;

	@IsNotEmpty()
	@Field(() => MISearch)
	search: MISearch;
}
