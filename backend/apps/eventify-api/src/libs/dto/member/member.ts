import { Field, Int, ObjectType } from '@nestjs/graphql';
import { MemberType, MemberStatus } from '../../enums/member.enum';
import { ObjectId } from 'mongoose';

@ObjectType()
export class Member {
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

	@Field(() => MemberType)
	memberType: MemberType;

	@Field(() => Number)
	memberPoints: number;

	@Field(() => String, { nullable: true })
	memberDesc?: string;

	@Field(() => String, { nullable: true })
	memberImage?: string;

	@Field(() => MemberStatus)
	memberStatus: MemberStatus;

	@Field(() => Boolean)
	emailVerified: boolean;

	@Field(() => Number)
	memberLikes: number;

	@Field(() => Number)
	memberFollowings: number;

	@Field(() => Number)
	memberFollowers: number;

	@Field(() => Number)
	memberViews: number;

	@Field(() => Date)
	createdAt: Date;

	@Field(() => Date)
	updatedAt: Date;

	// only for login
	memberPassword: string;

	// from aggregation
	@Field(() => String, { nullable: true })
	accessToken?: string;
}

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
