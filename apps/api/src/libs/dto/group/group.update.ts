import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsString, IsArray, IsNotEmpty } from 'class-validator';
import type { ObjectId } from 'mongoose';

@InputType()
export class GroupUpdateInput {
	// ===== Identification =====
	@IsNotEmpty()
	@Field(() => String)
	_id: ObjectId;

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

	// ===== Type and Status =====
	@Field(() => [String], { nullable: true })
	@IsOptional()
	@IsArray()
	groupCategories?: string[];
}
