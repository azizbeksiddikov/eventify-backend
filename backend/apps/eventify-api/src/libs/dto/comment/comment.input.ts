import { Field, InputType, Int } from '@nestjs/graphql';
import { IsIn, IsNotEmpty, IsOptional, Length, Min } from 'class-validator';
import { ObjectId } from 'mongoose';
import { CommentGroup } from '../../enums/comment.enum';
import { Direction } from '../../enums/common.enum';
import { availableCommentsSorts } from '../../config';

// ============== Comment Creation Input ==============
@InputType()
export class CommentInput {
	// ===== Type and Status =====
	@IsNotEmpty()
	@Field(() => CommentGroup)
	commentGroup: CommentGroup;

	// ===== Content =====
	@IsNotEmpty()
	@Length(1, 100)
	@Field(() => String)
	commentContent: string;

	// ===== References =====
	@IsNotEmpty()
	@Field(() => String)
	commentRefId: ObjectId;

	memberId?: ObjectId;
}

// ============== Search Inputs ==============
@InputType()
class CISearch {
	@IsNotEmpty()
	@Field(() => String)
	commentRefId: ObjectId;
}

// ============== Inquiry Inputs ==============
@InputType()
export class CommentsInquiry {
	// ===== Pagination =====
	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	page: number;

	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	limit: number;

	// ===== Sorting =====
	@IsOptional()
	@IsIn(availableCommentsSorts)
	@Field(() => String, { nullable: true })
	sort?: string;

	@IsOptional()
	@Field(() => Direction, { nullable: true })
	direction?: Direction;

	// ===== Search =====
	@IsNotEmpty()
	@Field(() => CISearch)
	search: CISearch;
}
