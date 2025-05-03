import { ObjectId } from 'bson';
import { ObjectId as MongooseId } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import { T } from './types/common';

export const shapeIntoMongoObjectId = (target: any) => {
	return typeof target === 'string' ? new ObjectId(target) : target;
};

// ============== File Configuration ==============
export const validMimeTypes = ['image/png', 'image/jpg', 'image/jpeg'];
export const getSerialForImage = (filename: string) => {
	const ext = path.parse(filename).ext;
	return uuidv4() + ext;
};

// ============== Sort Configuration ==============

export const availableEventsSorts = [
	'createdAt',
	'updatedAt',
	'eventDate',
	'eventLikes',
	'eventViews',
	'attendeeCount',
	'eventPrice',
];
export const availableOrganizersSorts = ['createdAt', 'updatedAt', 'memberLikes', 'memberViews', 'memberRank'];
export const availableMembersSorts = ['createdAt', 'updatedAt', 'memberLikes', 'memberViews', 'memberFollowers'];
export const availableTicketsSorts = ['createdAt', 'updatedAt', 'ticketPrice'];
export const availableReviewsSorts = ['createdAt', 'updatedAt', 'rating'];
export const availableCommentsSorts = ['createdAt', 'updatedAt', 'commentLikes'];

// ===== Member Lookups =====
export const lookupMember = {
	$lookup: {
		from: 'members',
		localField: 'memberId',
		foreignField: '_id',
		as: 'memberData',
	},
};

export const lookupAuthMemberLiked = (memberId: MongooseId | null, targetRefId: string = '$_id') => {
	return {
		$lookup: {
			from: 'likes',
			let: {
				localLikeRefId: targetRefId,
				localMemberId: memberId,
				localMyFavorite: true,
			},
			pipeline: [
				{
					$match: {
						$expr: {
							$and: [{ $eq: ['$likeRefId', '$$localLikeRefId'] }, { $eq: ['$memberId', '$$localMemberId'] }],
						},
					},
				},
				{
					$project: {
						_id: 0,
						memberId: 1,
						likeRefId: 1,
						myFavorite: '$$localMyFavorite',
					},
				},
			],
			as: 'meLiked',
		},
	};
};

export const lookupAuthMemberJoined = (memberId: MongooseId | null, targetRefId: string = '$_id') => {
	return {
		$lookup: {
			from: 'groupMembers',
			let: {
				localGroupId: targetRefId,
				localMemberId: memberId,
				localMeJoined: true,
			},
			pipeline: [
				{
					$match: {
						$expr: {
							$and: [{ $eq: ['$groupId', '$$localGroupId'] }, { $eq: ['$memberId', '$$localMemberId'] }],
						},
					},
				},
				{
					$project: {
						_id: 0,
						memberId: 1,
						groupId: 1,
						groupMemberRole: 1,
						joinDate: 1,
						meJoined: '$$localMeJoined',
					},
				},
			],
			as: 'meJoined',
		},
	};
};

// ============== Lookup Configuration ==============
interface LookupAuthMemberFollowed {
	followerId: MongooseId | null;
	followingId: string;
}

export const lookupAuthMemberFollowed = (input: LookupAuthMemberFollowed) => {
	const { followerId, followingId } = input;
	return {
		$lookup: {
			from: 'follows',
			let: {
				localFollowerId: followerId,
				localFollowingId: followingId,
				localMyFavorite: true,
			},
			pipeline: [
				{
					$match: {
						$expr: {
							$and: [{ $eq: ['$followerId', '$$localFollowerId'] }, { $eq: ['$followingId', '$$localFollowingId'] }],
						},
					},
				},
				{
					$project: {
						_id: 0,
						followingId: 1,
						followerId: 1,
						myFollowing: '$$localMyFavorite',
					},
				},
			],
			as: 'meFollowed',
		},
	};
};

// ===== Follow Lookups =====
export const lookupFollowingData = {
	$lookup: {
		from: 'members',
		localField: 'followingId',
		foreignField: '_id',
		as: 'followingData',
	},
};

export const lookupFollowerData = {
	$lookup: {
		from: 'members',
		localField: 'followerId',
		foreignField: '_id',
		as: 'followerData',
	},
};

// ===== View Lookups =====
export const lookupVisit = {
	$lookup: {
		from: 'members',
		localField: 'visitedEvent.memberId',
		foreignField: '_id',
		as: 'visitedEvent.memberData',
	},
};

export const lookupFavorite = {
	$lookup: {
		from: 'members',
		localField: 'favoriteEvent.memberId',
		foreignField: '_id',
		as: 'favoriteEvent.memberData',
	},
};
