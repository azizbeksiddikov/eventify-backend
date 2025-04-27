import { Field, InputType, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { ObjectId } from 'mongoose';

@InputType()
export class FollowInput {
	@Field(() => String)
	@IsNotEmpty()
	followingId: ObjectId;

	@Field(() => String)
	@IsNotEmpty()
	followerId: ObjectId;
}

@InputType()
class FollowSearch {
	@IsOptional()
	@Field(() => String, { nullable: true })
	followingId?: ObjectId;

	@IsOptional()
	@Field(() => String, { nullable: true })
	followerId?: ObjectId;
}

@InputType()
export class FollowInquiry {
	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	page: number;

	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	limit: number;

	@IsNotEmpty()
	@Field(() => FollowSearch)
	search: FollowSearch;
}
