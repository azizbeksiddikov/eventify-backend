import { Field, InputType, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { ObjectId } from 'mongoose';

// ============== Follow Creation Input ==============
@InputType()
export class FollowInput {
	// ===== References =====
	@Field(() => String)
	@IsNotEmpty()
	followingId: ObjectId;

	@Field(() => String)
	@IsNotEmpty()
	followerId: ObjectId;
}

// ============== Search Inputs ==============
@InputType()
class FollowSearch {
	// ===== References =====
	@IsOptional()
	@Field(() => String, { nullable: true })
	followingId?: ObjectId;

	@IsOptional()
	@Field(() => String, { nullable: true })
	followerId?: ObjectId;
}

// ============== Inquiry Inputs ==============
@InputType()
export class FollowInquiry {
	// ===== Pagination =====
	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	page: number;

	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	limit: number;

	// ===== Search =====
	@IsNotEmpty()
	@Field(() => FollowSearch)
	search: FollowSearch;
}
