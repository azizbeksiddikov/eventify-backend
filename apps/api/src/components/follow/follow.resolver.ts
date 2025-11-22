import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import type { ObjectId } from 'mongoose';

// ===== Guards & Decorators =====
import { AuthGuard } from '../auth/guards/auth.guard';
import { WithoutGuard } from '../auth/guards/without.guard';
import { AuthMember } from '../auth/decorators/authMember.decorator';

// ===== DTOs =====
import { Followers, Followings } from '../../libs/dto/follow/follow';
import { FollowInquiry } from '../../libs/dto/follow/follow.input';
import { Member } from '../../libs/dto/member/member';

// ===== Services =====
import { FollowService } from './follow.service';

// ===== Config =====
import { shapeIntoMongoObjectId } from '../../libs/config';

@Resolver()
export class FollowResolver {
	constructor(private readonly followService: FollowService) {}

	// ============== Follow Management Methods ==============
	@UseGuards(AuthGuard)
	@Mutation(() => Member)
	public async subscribe(@Args('input') input: string, @AuthMember('_id') memberId: ObjectId): Promise<Member> {
		console.log('Mutation: subscribe');
		const followingId = shapeIntoMongoObjectId(input);
		return await this.followService.subscribe(memberId, followingId);
	}

	@UseGuards(AuthGuard)
	@Mutation(() => Member)
	public async unsubscribe(@Args('input') input: string, @AuthMember('_id') memberId: ObjectId): Promise<Member> {
		console.log('Mutation: unsubscribe');
		const followingId = shapeIntoMongoObjectId(input);
		return await this.followService.unsubscribe(memberId, followingId);
	}

	// ============== Follow Query Methods ==============
	@UseGuards(WithoutGuard)
	@Query(() => Followings)
	public async getMemberFollowings(
		@Args('input') input: FollowInquiry,
		@AuthMember('_id') memberId: ObjectId | null,
	): Promise<Followings> {
		console.log('Query: getMemberFollowings');
		const { followerId } = input.search;
		input.search.followerId = shapeIntoMongoObjectId(followerId);
		return await this.followService.getMemberFollowings(memberId, input);
	}

	@UseGuards(WithoutGuard)
	@Query(() => Followers)
	public async getMemberFollowers(
		@Args('input') input: FollowInquiry,
		@AuthMember('_id') memberId: ObjectId | null,
	): Promise<Followers> {
		console.log('Query: getMemberFollowers');
		const { followingId } = input.search;
		input.search.followingId = shapeIntoMongoObjectId(followingId);
		return await this.followService.getMemberFollowers(memberId, input);
	}

	@UseGuards(AuthGuard)
	@Query(() => [Member])
	public async getMemberFollowingsList(@AuthMember('_id') memberId: ObjectId): Promise<Member[]> {
		console.log('Query: getMemberFollowingsList');
		return await this.followService.getMemberFollowingsList(memberId);
	}

	@UseGuards(AuthGuard)
	@Query(() => [Member])
	public async getMemberFollowersList(@AuthMember('_id') memberId: ObjectId): Promise<Member[]> {
		console.log('Query: getMemberFollowersList');
		return await this.followService.getMemberFollowersList(memberId);
	}
}
