import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { IsNotEmpty, IsString } from 'class-validator';

@ObjectType()
export class Category {
	@Field()
	_id: string;

	@Field()
	name: string;

	@Field()
	description: string;

	@Field()
	createdAt: Date;

	@Field()
	updatedAt: Date;
}

@InputType()
export class CreateCategoryDto {
	@Field()
	@IsString()
	@IsNotEmpty()
	name: string;

	@Field()
	@IsString()
	@IsNotEmpty()
	description: string;
}

@InputType()
export class UpdateCategoryDto {
	@Field({ nullable: true })
	@IsString()
	name?: string;

	@Field({ nullable: true })
	@IsString()
	description?: string;
}
