import { Field, ObjectType } from '@nestjs/graphql';
import { ObjectId } from 'mongoose';
import { Member, TotalCounter } from '../member/member';
import { MeLiked } from '../like/like';
import { GroupMemberRole } from '../../enums/group.enum';
import { GroupMember } from '../groupMembers/groupMember';
import { Event } from '../event/event';

@ObjectType()
export class MeJoined {
	@Field(() => String)
	memberId: ObjectId;

	@Field(() => String)
	groupId: ObjectId;

	@Field(() => GroupMemberRole)
	groupMemberRole: GroupMemberRole;

	@Field(() => Date)
	joinDate: Date;

	@Field(() => Boolean)
	meJoined: boolean;
}

@ObjectType()
export class Group {
	// ===== Basic Information =====
	@Field(() => String)
	_id: ObjectId;

	@Field(() => String)
	groupName: string;

	@Field(() => String)
	groupDesc: string;

	@Field(() => String)
	groupImage: string;

	@Field(() => String)
	memberId: ObjectId;

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

	/** from aggregation **/
	@Field(() => Member, { nullable: true })
	memberData?: Member;

	@Field(() => [MeLiked], { nullable: true })
	meLiked?: MeLiked[];

	@Field(() => [MeJoined], { nullable: true })
	meJoined?: MeJoined[];

	@Field(() => [Group], { nullable: true })
	similarGroups?: Group[];

	@Field(() => [Event], { nullable: true })
	groupUpcomingEvents?: Event[];

	@Field(() => [GroupMember], { nullable: true })
	groupModerators?: GroupMember[];
}

@ObjectType()
export class Groups {
	@Field(() => [Group])
	list: Group[];

	@Field(() => [TotalCounter], { nullable: true })
	metaCounter: TotalCounter[];
}
