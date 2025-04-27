import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsOptional, IsArray, IsNumber, Min } from 'class-validator';
import { GroupCategory } from '../../enums/group.enum';

@InputType()
export class GroupInput {
	@Field(() => String)
	@IsNotEmpty()
	groupLink: string;

	@Field(() => String)
	@IsNotEmpty()
	groupName: string;

	@Field(() => String)
	@IsNotEmpty()
	groupDesc: string;

	@Field(() => String)
	@IsNotEmpty()
	groupImage: string;

	@Field(() => [GroupCategory], { defaultValue: [] })
	@IsOptional()
	@IsArray()
	groupCategories?: GroupCategory[];
}

@InputType()
export class GroupsSearch {
	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	text?: string;

	@Field(() => [String], { nullable: true })
	@IsOptional()
	@IsArray()
	categories?: string[];
}

@InputType()
export class GroupsInquiry {
	@Field(() => Number, { defaultValue: 1 })
	@IsNumber()
	@Min(1)
	page: number;

	@Field(() => Number, { defaultValue: 10 })
	@IsNumber()
	@Min(1)
	limit: number;

	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	sort?: string;

	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	direction?: string;

	@Field(() => GroupsSearch, { nullable: true })
	@IsOptional()
	search?: GroupsSearch;
}
