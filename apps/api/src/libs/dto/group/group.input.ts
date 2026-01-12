import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsOptional, IsArray, IsNumber, Min, IsEnum } from 'class-validator';
import { GroupCategory } from '../../enums/group.enum';
import { Direction } from '../../enums/common.enum';

// ============== Group Creation Input ==============
@InputType()
export class GroupInput {
	@Field(() => String)
	@IsNotEmpty()
	groupName: string;

	@Field(() => String)
	@IsNotEmpty()
	groupDesc: string;

	@Field(() => String)
	@IsNotEmpty()
	groupImage: string;

	// ===== Optional Fields =====
	@Field(() => [GroupCategory], { defaultValue: [] })
	@IsOptional()
	@IsArray()
	groupCategories?: GroupCategory[];
}

// ============== Search Inputs ==============
@InputType()
export class GroupsSearch {
	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	text?: string;

	@Field(() => [GroupCategory], { nullable: true })
	@IsOptional()
	@IsArray()
	groupCategories?: GroupCategory[];
}

// ============== Inquiry Inputs ==============
@InputType()
export class GroupsInquiry {
	// ===== Pagination =====
	@Field(() => Number, { defaultValue: 1 })
	@IsNumber()
	@Min(1)
	page: number;

	@Field(() => Number, { defaultValue: 10 })
	@IsNumber()
	@Min(1)
	limit: number;

	// ===== Sorting =====
	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	sort?: string;

	@Field(() => Direction, { nullable: true })
	@IsOptional()
	@IsEnum(Direction)
	direction?: Direction;

	// ===== Search =====
	@Field(() => GroupsSearch, { nullable: true })
	@IsOptional()
	search?: GroupsSearch;
}
