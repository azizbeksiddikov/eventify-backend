import { Field, ObjectType } from '@nestjs/graphql';
import { ObjectId } from 'mongoose';
import { TotalCounter } from '../member/member';

@ObjectType()
export class Group {
	// ===== Basic Information =====
	@Field(() => String)
	_id: ObjectId;

	@Field(() => String)
	groupLink: string;

	@Field(() => String)
	groupName: string;

	@Field(() => String)
	groupDesc: string;

	@Field(() => String)
	groupImage: string;

	@Field(() => String)
	groupOwnerId: ObjectId;

	// ===== Type and Status =====
	@Field(() => [String])
	groupCategories: string[];

	// ===== Statistics =====
	@Field(() => Number)
	groupViews: number;

	@Field(() => Number)
	groupLikes: number;

	@Field(() => Number)
	memberCount: number;

	// ===== Timestamps =====
	@Field(() => Date)
	createdAt: Date;

	@Field(() => Date)
	updatedAt: Date;
}

@ObjectType()
export class Groups {
	@Field(() => [Group])
	list: Group[];

	@Field(() => [TotalCounter], { nullable: true })
	metaCounter: TotalCounter[];
}
