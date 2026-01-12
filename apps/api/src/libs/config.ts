import { Types } from 'mongoose';
import type { ObjectId } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import { BadRequestException } from '@nestjs/common';

export const shapeIntoMongoObjectId = (target: string | ObjectId): ObjectId => {
	if (typeof target === 'string') {
		try {
			return new Types.ObjectId(target) as unknown as ObjectId;
		} catch (error) {
			// Check if it's a BSON error (invalid ObjectId format)
			if (
				error instanceof Error &&
				(error.name === 'BSONError' || error.message?.includes('must be a 24 character hex string'))
			) {
				throw new BadRequestException(
					`Invalid ObjectId format: "${target}". ObjectId must be a 24 character hex string.`,
				);
			}
			// Re-throw if it's a different error
			throw error;
		}
	}
	// If it's already an ObjectId, return it
	return target;
};

/**
 * Convert ObjectId to string safely
 * Handles both ObjectId instances and string values
 */
export const shapeObjectIdToString = (target: ObjectId | string | null | undefined): string => {
	if (!target) return '';
	if (typeof target === 'string') return target;
	// Check if it's an ObjectId instance and use toHexString() for explicit conversion
	if (target instanceof Types.ObjectId) {
		return target.toHexString();
	}
	// For ObjectId type (not instance), cast to Types.ObjectId to access toHexString()
	const objectId = target as unknown as Types.ObjectId;
	if (objectId && typeof objectId.toHexString === 'function') {
		return objectId.toHexString();
	}
	// Final fallback: ObjectId.toString() returns hex string, but linter doesn't know this
	// eslint-disable-next-line @typescript-eslint/no-base-to-string
	return String(target);
};

// ============== File Configuration ==============
export const validMimeTypes = ['image/png', 'image/jpg', 'image/jpeg'];
export const getSerialForImage = (filename: string) => {
	const ext = path.parse(filename).ext;
	return uuidv4() + ext;
};

// ===== Member Lookups =====
export const lookupMember = {
	$lookup: {
		from: 'members',
		localField: 'memberId',
		foreignField: '_id',
		pipeline: [
			{
				$project: {
					memberPassword: 0,
					memberPoints: 0,
				},
			},
		],
		as: 'memberData',
	},
};

export const lookupAuthMemberLiked = (memberId: ObjectId | null, targetRefId: string = '$_id') => {
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

export const lookupAuthMemberJoined = (memberId: ObjectId | null, targetRefId: string = '$_id') => {
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
	followerId: ObjectId | null;
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
		pipeline: [
			{
				$project: {
					memberPassword: 0,
					memberPoints: 0,
				},
			},
		],
		as: 'followingData',
	},
};

export const lookupFollowerData = {
	$lookup: {
		from: 'members',
		localField: 'followerId',
		foreignField: '_id',
		pipeline: [
			{
				$project: {
					memberPassword: 0,
					memberPoints: 0,
				},
			},
		],
		as: 'followerData',
	},
};

// ===== View Lookups =====
export const lookupVisit = {
	$lookup: {
		from: 'members',
		localField: 'visitedEvent.memberId',
		foreignField: '_id',
		pipeline: [
			{
				$project: {
					memberPassword: 0,
					memberPoints: 0,
				},
			},
		],
		as: 'visitedEvent.memberData',
	},
};

export const lookupFavorite = {
	$lookup: {
		from: 'members',
		localField: 'favoriteEvent.memberId',
		foreignField: '_id',
		pipeline: [
			{
				$project: {
					memberPassword: 0,
					memberPoints: 0,
				},
			},
		],
		as: 'favoriteEvent.memberData',
	},
};
