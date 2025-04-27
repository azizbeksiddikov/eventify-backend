import { Schema } from 'mongoose';

const GroupSchema = new Schema(
	{
		groupName: {
			type: String,
			required: true,
			index: true,
			maxlength: 100,
		},
		groupDesc: {
			type: String,
			required: true,
			maxlength: 2000,
		},
		groupImage: {
			type: String,
			required: true,
		},
		groupViews: {
			type: Number,
			default: 0,
			min: 0,
		},
		groupLikes: {
			type: Number,
			default: 0,
			min: 0,
		},
		groupCategories: {
			type: [String],
			default: [],
		},
		groupAdminId: {
			type: Schema.Types.ObjectId,
			ref: 'Member',
			required: true,
			index: true,
		},
		memberCount: {
			type: Number,
			default: 1,
			min: 1,
		},
	},
	{
		timestamps: true,
		collection: 'groups',
	},
);

export default GroupSchema;
