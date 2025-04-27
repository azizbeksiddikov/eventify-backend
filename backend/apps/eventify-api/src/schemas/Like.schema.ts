import { Schema } from 'mongoose';
import { LikeGroup } from '../libs/enums/like.enum';

const LikeSchema = new Schema(
	{
		memberId: {
			type: Schema.Types.ObjectId,
			ref: 'Member',
			required: true,
		},
		likeGroup: {
			type: String,
			enum: LikeGroup,
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
