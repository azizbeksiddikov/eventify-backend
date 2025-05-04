import { Schema } from 'mongoose';
import { MemberType, MemberStatus } from '../libs/enums/member.enum';

const MemberSchema = new Schema(
	{
		// ===== Basic Information =====
		username: {
			type: String,
			required: true,
			unique: true,
		},
		memberEmail: {
			type: String,
			required: true,
			unique: true,
		},
		memberPhone: {
			type: String,
		},
		memberFullName: {
			type: String,
			required: true,
		},

		// ===== Authentication =====
		memberPassword: {
			type: String,
			required: true,
			select: false,
		},

		// ===== Type and Status =====
		memberType: {
			type: String,
			enum: MemberType,
			default: MemberType.USER,
		},
		memberStatus: {
			type: String,
			enum: MemberStatus,
			default: MemberStatus.ACTIVE,
		},
		emailVerified: {
			type: Boolean,
			default: false,
		},

		// ===== Profile Information =====
		memberDesc: {
			type: String,
			maxlength: 500,
		},
		memberImage: {
			type: String,
		},

		// ===== Statistics =====
		memberPoints: {
			type: Number,
			default: 50,
			min: 0,
		},
		memberLikes: {
			type: Number,
			default: 0,
			min: 0,
		},
		memberFollowings: {
			type: Number,
			default: 0,
			min: 0,
		},
		memberFollowers: {
			type: Number,
			default: 0,
			min: 0,
		},
		memberViews: {
			type: Number,
			default: 0,
			min: 0,
		},

		memberRank: {
			type: Number,
			default: 0,
			min: 0,
		},
		memberGroups: {
			type: Number,
			default: 0,
			min: 0,
		},
		memberEvents: {
			type: Number,
			default: 0,
			min: 0,
		},
	},

	{
		timestamps: true,
		collection: 'members',
	},
);

export default MemberSchema;
