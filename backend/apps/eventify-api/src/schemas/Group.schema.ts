import { Schema } from 'mongoose';

const GroupSchema = new Schema(
	{
		groupName: {
			type: String,
			required: true,
		},
		groupDesc: {
			type: String,
		},
		groupImage: {
			type: String,
		},
		groupViews: {
			type: Number,
			default: 0,
		},
		groupLikes: {
			type: Number,
			default: 0,
		},
		groupCategories: {
			type: [String],
			default: [],
		},
	},
	{
		timestamps: true,
		collection: 'groups',
	},
);

export default GroupSchema;
