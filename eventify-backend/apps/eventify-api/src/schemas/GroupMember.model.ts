import { Schema } from 'mongoose';
import { GroupMemberRole } from '../libs/enums/group.enum';

const GroupMemberSchema = new Schema(
	{
		// ===== Basic Information =====
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

		// ===== Type and Status =====
		groupMemberRole: {
			type: String,
			enum: GroupMemberRole,
			required: true,
		},

		// ===== Timestamps =====
		joinDate: {
			type: Date,
			required: true,
		},
	},
	{
		timestamps: true,
		collection: 'groupMembers',
	},
);

// Create compound index for unique groupId and memberId combination
GroupMemberSchema.index({ groupId: 1, memberId: 1 }, { unique: true });

export default GroupMemberSchema;
