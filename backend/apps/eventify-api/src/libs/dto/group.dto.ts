import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

@ObjectType()
export class Group {
	@Field()
	_id: string;

	@Field()
	groupName: string;

	@Field()
	groupDesc: string;

	@Field({ nullable: true })
	groupImage?: string;

	@Field(() => [String])
	groupCategories: string[];

	@Field()
	groupViews: number;

	@Field()
	groupLikes: number;

	@Field()
	createdAt: Date;

	@Field()
	updatedAt: Date;
}

@InputType()
export class CreateGroupDto {
	@Field()
	@IsString()
	@IsNotEmpty()
	groupName: string;

	@Field()
	@IsString()
	@IsNotEmpty()
	groupDesc: string;

	@Field({ nullable: true })
	@IsString()
	@IsOptional()
	groupImage?: string;

	@Field(() => [String])
	@IsString({ each: true })
	groupCategories: string[];
}

@InputType()
export class UpdateGroupDto {
	@Field({ nullable: true })
	@IsString()
	@IsOptional()
	groupName?: string;

	@Field({ nullable: true })
	@IsString()
	@IsOptional()
	groupDesc?: string;

	@Field({ nullable: true })
	@IsString()
	@IsOptional()
	groupImage?: string;

	@Field(() => [String], { nullable: true })
	@IsString({ each: true })
	@IsOptional()
	groupCategories?: string[];
}
