import { Schema } from 'mongoose';
import { MemberType, MemberStatus } from '../libs/enums/member.enum';

const MemberSchema = new Schema(
	{
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
			unique: true,
		},
		memberPassword: {
			type: String,
			required: true,
			select: false,
		},
		memberFullName: {
			type: String,
			required: true,
		},
		memberType: {
			type: String,
			enum: MemberType,
			default: MemberType.USER,
		},
		memberPoints: {
			type: Number,
			default: 50,
			min: 0,
		},
		memberDesc: {
			type: String,
			maxlength: 500,
		},
		memberImage: {
			type: String,
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
	},

	{
		timestamps: true,
		collection: 'members',
	},
);

export default MemberSchema;
