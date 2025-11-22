import { Field, ObjectType } from '@nestjs/graphql';
import { LikeGroup } from '../../enums/like.enum';
import type { ObjectId } from 'mongoose';

@ObjectType()
export class Like {
	// ===== Basic Information =====
	@Field(() => String)
	_id: ObjectId;

	// ===== Type and Group =====
	@Field(() => LikeGroup)
	likeGroup: LikeGroup;

	// ===== References =====
	@Field(() => String)
	memberId: ObjectId;

	@Field(() => String)
	likeRefId: ObjectId;

	// ===== Timestamps =====
	@Field(() => Date)
	createdAt: Date;
}

@ObjectType()
export class MeLiked {
	// ===== References =====
	@Field(() => String)
	memberId: ObjectId;

	@Field(() => String)
	likeRefId: ObjectId;

	// ===== Status =====
	@Field(() => Boolean)
	myFavorite: boolean;
}
