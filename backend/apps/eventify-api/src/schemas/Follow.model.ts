import { Schema } from 'mongoose';

const FollowSchema = new Schema(
	{
		// ===== References =====
		followingId: {
			type: Schema.Types.ObjectId,
			ref: 'Member',
			required: true,
		},
		followerId: {
			type: Schema.Types.ObjectId,
			ref: 'Member',
			required: true,
		},
	},
	{
		timestamps: true,
		collection: 'follows',
	},
);

// Create compound index for followingId and followerId
FollowSchema.index({ followingId: 1, followerId: 1 }, { unique: true });

export default FollowSchema;
