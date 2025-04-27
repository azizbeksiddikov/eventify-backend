import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsString, IsEnum, IsNumber, Min, Max, IsNotEmpty } from 'class-validator';
import { ObjectId } from 'mongoose';

@InputType()
export class UpdateReviewInput {
	@IsNotEmpty()
	@Field(() => String)
	_id: ObjectId;

	@Field(() => Number, { nullable: true })
	@IsOptional()
	@IsNumber()
	@Min(1)
	@Max(5)
	rating?: number;

	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	comment?: string;
}
