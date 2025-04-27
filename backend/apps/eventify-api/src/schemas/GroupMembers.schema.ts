import { Schema } from 'mongoose';
import { MemberRole } from '../libs/enums/group.enum';

const GroupMembersSchema = new Schema(
	{
		groupId: {
			type: Schema.Types.ObjectId,
			ref: 'Group',
			required: true,
		},
		memberId: {
			type: Schema.Types.ObjectId,
			ref: 'Member',
			required: true,
		},
		memberRole: {
			type: String,
			enum: MemberRole,
			required: true,
		},
		joinDate: {
			type: Date,
			default: Date.now,
		},
	},
	{
		timestamps: true,
		collection: 'group_members',
	},
);

// Create compound index for unique groupId and memberId combination
GroupMembersSchema.index({ groupId: 1, memberId: 1 }, { unique: true });

export default GroupMembersSchema;
