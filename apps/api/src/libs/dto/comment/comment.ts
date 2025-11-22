import { Field, Int, ObjectType } from '@nestjs/graphql';
import { ObjectId } from 'mongoose';
import { CommentGroup, CommentStatus } from '../../enums/comment.enum';
import { Member, TotalCounter } from '../member/member';

@ObjectType()
export class Comment {
	// ===== Basic Information =====
	@Field(() => String)
	_id: ObjectId;

	// ===== Type and Status =====
	@Field(() => CommentStatus)
	commentStatus: CommentStatus;

	@Field(() => CommentGroup)
	commentGroup: CommentGroup;

	// ===== Content =====
	@Field(() => String)
	commentContent: string;

	// ===== References =====
	@Field(() => String)
	commentRefId: ObjectId;

	@Field(() => String)
	memberId: ObjectId;

	// ===== Timestamps =====
	@Field(() => Date)
	createdAt: Date;

	@Field(() => Date)
	updatedAt: Date;

	// ===== Aggregated Fields =====
	@Field(() => Member, { nullable: true })
	memberData?: Member;
}

@ObjectType()
export class Comments {
	@Field(() => [Comment])
	list: Comment[];

	@Field(() => [TotalCounter], { nullable: true })
	metaCounter: TotalCounter[];
}
