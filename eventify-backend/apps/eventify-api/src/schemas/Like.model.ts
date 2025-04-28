import { Schema } from 'mongoose';
import { LikeGroup } from '../libs/enums/like.enum';

const LikeSchema = new Schema(
	{
		// ===== Type and Group =====
		likeGroup: {
			type: String,
			enum: LikeGroup,
			required: true,
		},

		// ===== References =====
		memberId: {
			type: Schema.Types.ObjectId,
			ref: 'Member',
			required: true,
		},

		likeRefId: {
			type: Schema.Types.ObjectId,
			required: true,
		},
	},
	{
		timestamps: true,
		collection: 'likes',
	},
);

// Create compound index for memberId, likeGroup, and likeRefId
LikeSchema.index({ memberId: 1, likeGroup: 1, likeRefId: 1 }, { unique: true });

export default LikeSchema;
