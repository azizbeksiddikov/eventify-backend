import { Schema } from 'mongoose';
import { ViewGroup } from '../libs/enums/view.enum';

const ViewSchema = new Schema(
	{
		memberId: {
			type: Schema.Types.ObjectId,
			ref: 'Member',
			required: true,
		},
		viewGroup: {
			type: String,
			enum: ViewGroup,
			required: true,
		},
		viewRefId: {
			type: Schema.Types.ObjectId,
			required: true,
		},
	},
	{
		timestamps: true,
		collection: 'views',
	},
);

// Create compound index for memberId, viewGroup, and viewRefId
ViewSchema.index({ memberId: 1, viewGroup: 1, viewRefId: 1 }, { unique: true });

export default ViewSchema;
