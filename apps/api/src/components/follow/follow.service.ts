import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';

// ===== Enums =====
import { Direction, Message } from '../../libs/enums/common.enum';

// ===== DTOs =====
import { Follower, Followers, Following, Followings } from '../../libs/dto/follow/follow';
import { FollowInquiry } from '../../libs/dto/follow/follow.input';

// ===== Types =====
import { T } from '../../libs/types/common';
import { MemberType } from '../../libs/enums/member.enum';
import { Member } from '../../libs/dto/member/member';
import { NotificationType } from '../../libs/enums/notification.enum';
import { NotificationInput } from '../../libs/dto/notification/notification.input';

// ===== Config =====
import {
	lookupAuthMemberFollowed,
	lookupAuthMemberLiked,
	lookupFollowerData,
	lookupFollowingData,
	shapeObjectIdToString,
} from '../../libs/config';

// ===== Services =====
import { MemberService } from '../member/member.service';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class FollowService {
	constructor(
		@InjectModel('Follow') private readonly followModel: Model<Follower | Following>,
		private readonly memberService: MemberService,
		private readonly notificationService: NotificationService,
	) {}

	// ============== Follow Management Methods ==============
	public async subscribe(followerId: ObjectId, followingId: ObjectId): Promise<Member> {
		// check self subscription
		const followerIdStr = shapeObjectIdToString(followerId);
		const followingIdStr = shapeObjectIdToString(followingId);
		if (followerIdStr === followingIdStr) {
			throw new InternalServerErrorException(Message.SELF_SUBSRIPTION_DENIED);
		}

		// get target member
		const targetMember = await this.memberService.getSimpleMember(followingId);
		if (!targetMember) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		// check if already subscribed
		const existingSubscription = await this.followModel
			.findOne({ followingId: followingId, followerId: followerId })
			.exec();
		if (existingSubscription) throw new InternalServerErrorException(Message.ALREADY_SUBSCRIBED);

		// create subscription
		try {
			await this.followModel.create({ followingId: followingId, followerId: followerId });

			// update stats
			await this.memberService.memberStatsEditor({ _id: followerId, targetKey: 'memberFollowings', modifier: 1 });
			await this.memberService.memberStatsEditor({
				_id: followingId,
				targetKey: 'memberFollowers',
				modifier: 1,
			});
			const newNotification: NotificationInput = {
				memberId: followerId,
				receiverId: followingId,
				notificationType: NotificationType.FOLLOW_MEMBER,
			};

			if (targetMember.memberType === MemberType.ORGANIZER) {
				newNotification.notificationLink = `/organizers/${shapeObjectIdToString(followerId)}`;
			}
			await this.notificationService.createNotification(newNotification);

			targetMember.memberFollowers += 1;
			targetMember.meFollowed = [{ followingId: followingId, followerId: followerId, myFollowing: true }];

			return targetMember;
		} catch (err) {
			console.log('Error, Service.model', err);
			throw new BadRequestException(Message.CREATE_FAILED);
		}
	}

	public async unsubscribe(followerId: ObjectId, followingId: ObjectId): Promise<Member> {
		const targetMember = await this.memberService.getSimpleMember(followingId);
		if (!targetMember) throw new NotFoundException(Message.NO_DATA_FOUND);

		const result = await this.followModel.findOneAndDelete({ followingId: followingId, followerId: followerId }).exec();
		if (!result) throw new BadRequestException(Message.NOT_SUBSCRIBED);

		await this.memberService.memberStatsEditor({ _id: followerId, targetKey: 'memberFollowings', modifier: -1 });
		await this.memberService.memberStatsEditor({ _id: followingId, targetKey: 'memberFollowers', modifier: -1 });

		targetMember.memberFollowers -= 1;
		targetMember.meFollowed = [];

		return targetMember;
	}

	// ============== Follow Query Methods ==============
	public async getMemberFollowings(memberId: ObjectId | null, input: FollowInquiry): Promise<Followings> {
		const { page, limit, search } = input;
		if (!search?.followerId) throw new InternalServerErrorException(Message.BAD_REQUEST);

		const match: T = { followerId: search?.followerId };

		const result = await this.followModel
			.aggregate<Followings>([
				{ $match: match },
				{ $sort: { created: Direction.DESC } },
				{
					$facet: {
						list: [
							{ $skip: (page - 1) * limit },
							{ $limit: limit },
							lookupAuthMemberLiked(memberId, '$followingId'),
							lookupAuthMemberFollowed({ followerId: memberId, followingId: '$followingId' }),
							lookupFollowingData,
							{ $unwind: '$followingData' },
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();
		if (!result || result.length === 0) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		return result[0];
	}

	public async getMemberFollowers(memberId: ObjectId | null, input: FollowInquiry): Promise<Followers> {
		const { page, limit, search } = input;
		if (!search?.followingId) throw new InternalServerErrorException(Message.BAD_REQUEST);

		const match: T = { followingId: search?.followingId };

		const result = await this.followModel
			.aggregate<Followers>([
				{ $match: match },
				{ $sort: { created: Direction.DESC } },
				{
					$facet: {
						list: [
							{ $skip: (page - 1) * limit },
							{ $limit: limit },
							lookupAuthMemberLiked(memberId, '$followerId'),
							lookupAuthMemberFollowed({ followerId: memberId, followingId: '$followerId' }),
							lookupFollowerData,
							{ $unwind: '$followerData' },
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();
		if (!result || result.length === 0) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		return result[0];
	}

	public async getMemberFollowingsList(memberId: ObjectId): Promise<Member[]> {
		const result = await this.followModel
			.aggregate<Member>([
				{ $match: { followerId: memberId } },
				{ $sort: { created: Direction.DESC } },
				{ $lookup: { from: 'members', localField: 'followingId', foreignField: '_id', as: 'followingData' } },
				{ $unwind: '$followingData' },
				{
					$addFields: {
						'followingData.meFollowed': [
							{
								followerId: '$followerId',
								followingId: '$followingId',
								myFollowing: true,
							},
						],
					},
				},
				{ $replaceRoot: { newRoot: '$followingData' } },
				lookupAuthMemberLiked(memberId, '$_id'),
			])
			.exec();

		return result;
	}

	public async getMemberFollowersList(memberId: ObjectId): Promise<Member[]> {
		const result = await this.followModel
			.aggregate<Member>([
				{ $match: { followingId: memberId } },
				{ $sort: { created: Direction.DESC } },
				{ $lookup: { from: 'members', localField: 'followerId', foreignField: '_id', as: 'followerData' } },
				{ $unwind: '$followerData' },
				{ $replaceRoot: { newRoot: '$followerData' } },
				lookupAuthMemberLiked(memberId, '$_id'),
				lookupAuthMemberFollowed({ followerId: memberId, followingId: '$_id' }),
			])
			.exec();

		return result;
	}
}
