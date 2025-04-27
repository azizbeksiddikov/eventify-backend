import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsEnum, IsNumber, Min, Max, IsOptional } from 'class-validator';
import { ReviewGroup } from '../../enums/review.enum';

@InputType()
export class CreateReviewInput {
	@Field(() => String)
	@IsNotEmpty()
	@IsString()
	memberId: string;

	@Field(() => ReviewGroup)
	@IsNotEmpty()
	@IsEnum(ReviewGroup)
	reviewGroup: ReviewGroup;

	@Field(() => String)
	@IsNotEmpty()
	@IsString()
	reviewRefId: string;

	@Field(() => Number)
	@IsNotEmpty()
	@IsNumber()
	@Min(1)
	@Max(5)
	rating: number;

	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	comment?: string;
}
