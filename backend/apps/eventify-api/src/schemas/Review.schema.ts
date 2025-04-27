import { Schema } from 'mongoose';
import { ReviewGroup } from '../libs/enums/review.enum';

const ReviewSchema = new Schema(
	{
		memberId: {
			type: Schema.Types.ObjectId,
			ref: 'Member',
			required: true,
		},
		reviewGroup: {
			type: String,
			enum: ReviewGroup,
			required: true,
		},
		reviewRefId: {
			type: Schema.Types.ObjectId,
			required: true,
		},
		rating: {
			type: Number,
			required: true,
			min: 1,
			max: 5,
		},
		comment: {
			type: String,
		},
	},
	{
		timestamps: true,
		collection: 'reviews',
	},
);

// Create compound index for memberId, reviewGroup, and reviewRefId
ReviewSchema.index({ memberId: 1, reviewGroup: 1, reviewRefId: 1 }, { unique: true });

export default ReviewSchema;
