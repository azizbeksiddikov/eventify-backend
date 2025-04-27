import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsOptional, IsArray } from 'class-validator';

@InputType()
export class CreateGroupInput {
	@Field(() => String)
	@IsNotEmpty()
	@IsString()
	groupName: string;

	@Field(() => String)
	@IsNotEmpty()
	@IsString()
	groupDesc: string;

	@Field(() => String)
	@IsNotEmpty()
	@IsString()
	groupImage: string;

	@Field(() => [String], { defaultValue: [] })
	@IsOptional()
	@IsArray()
	groupCategories?: string[];
}
