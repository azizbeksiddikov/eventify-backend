import { Field, Int, ObjectType } from '@nestjs/graphql';
import { MemberType, MemberStatus } from '../../enums/member.enum';
import type { ObjectId } from 'mongoose';
import { MeFollowed } from '../follow/follow';
import { MeLiked } from '../like/like';
import { Group } from '../group/group';
import { Event } from '../event/event';

// ============== Core Member Type ==============
@ObjectType()
export class Member {
	// ===== Basic Information =====
	@Field(() => String)
	_id: ObjectId;

	@Field(() => String)
	username: string;

	@Field(() => String)
	memberEmail: string;

	@Field(() => String, { nullable: true })
	memberPhone?: string;

	@Field(() => String)
	memberFullName: string;

	// ===== Status and Type =====
	@Field(() => MemberType)
	memberType: MemberType;

	@Field(() => MemberStatus)
	memberStatus: MemberStatus;

	@Field(() => Boolean)
	emailVerified: boolean;

	// ===== Profile Information =====
	@Field(() => String, { nullable: true })
	memberDesc?: string;

	@Field(() => String, { nullable: true })
	memberImage?: string;

	// ===== Statistics =====
	@Field(() => Number, { nullable: true })
	memberPoints?: number;

	@Field(() => Number)
	memberLikes: number;

	@Field(() => Number)
	memberFollowings: number;

	@Field(() => Number)
	memberFollowers: number;

	@Field(() => Number)
	memberViews: number;

	@Field(() => Number)
	memberRank: number;

	@Field(() => Number)
	memberGroups: number;

	@Field(() => Number)
	memberEvents: number;

	@Field(() => Number)
	eventsOrganizedCount: number;

	// ===== Timestamps =====
	@Field(() => Date)
	createdAt: Date;

	@Field(() => Date)
	updatedAt: Date;

	// ===== Internal Fields =====
	memberPassword: string;

	// ===== Aggregated Fields =====
	@Field(() => String, { nullable: true })
	accessToken?: string;

	// GET ME
	@Field(() => [MeLiked], { nullable: true })
	meLiked?: MeLiked[];

	@Field(() => [MeFollowed], { nullable: true })
	meFollowed?: MeFollowed[];

	// GET ORGANIZER
	@Field(() => [Event], { nullable: true })
	organizedEvents?: Event[];

	@Field(() => [Group], { nullable: true })
	organizedGroups?: Group[];
}

// ============== Pagination Types ==============
@ObjectType()
export class TotalCounter {
	@Field(() => Int, { nullable: true })
	total?: number;
}

@ObjectType()
export class Members {
	@Field(() => [Member])
	list: Member[];

	@Field(() => [TotalCounter])
	metaCounter: TotalCounter[];
}
