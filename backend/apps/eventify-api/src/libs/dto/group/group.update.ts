import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsString, IsArray, IsNotEmpty } from 'class-validator';
import { ObjectId } from 'mongoose';

@InputType()
export class GroupUpdateInput {
	@IsNotEmpty()
	@Field(() => String)
	_id: ObjectId;

	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	groupLink?: string;

	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	groupName?: string;

	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	groupDesc?: string;

	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	groupImage?: string;

	@Field(() => [String], { nullable: true })
	@IsOptional()
	@IsArray()
	groupCategories?: string[];
}
