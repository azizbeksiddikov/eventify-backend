import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { ReviewGroup } from '../enums/common.enum';

@ObjectType()
export class Review {
	@Field()
	_id: string;

	@Field()
	memberId: string;

	@Field(() => ReviewGroup)
	reviewGroup: ReviewGroup;

	@Field()
	reviewRefId: string;

	@Field()
	@Min(1)
	@Max(5)
	rating: number;

	@Field()
	comment: string;

	@Field()
	createdAt: Date;

	@Field()
	updatedAt: Date;
}

@InputType()
export class CreateReviewDto {
	@Field()
	@IsString()
	@IsNotEmpty()
	memberId: string;

	@Field(() => ReviewGroup)
	@IsEnum(ReviewGroup)
	reviewGroup: ReviewGroup;

	@Field()
	@IsString()
	@IsNotEmpty()
	reviewRefId: string;

	@Field()
	@IsNumber()
	@Min(1)
	@Max(5)
	rating: number;

	@Field()
	@IsString()
	@IsNotEmpty()
	comment: string;
}

@InputType()
export class UpdateReviewDto {
	@Field({ nullable: true })
	@IsNumber()
	@Min(1)
	@Max(5)
	@IsOptional()
	rating?: number;

	@Field({ nullable: true })
	@IsString()
	@IsOptional()
	comment?: string;
}
