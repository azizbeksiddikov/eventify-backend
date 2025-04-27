import { Schema } from 'mongoose';
import { GroupCategory } from '../libs/enums/group.enum';

const GroupSchema = new Schema(
	{
		groupLink: {
			type: String,
			required: true,
			unique: true,
		},

		groupName: {
			type: String,
			required: true,
		},

		groupDesc: {
			type: String,
			required: true,
			maxlength: 1000,
		},

		groupImage: {
			type: String,
			required: true,
		},

		groupOwnerId: {
			type: Schema.Types.ObjectId,
			ref: 'Member',
			required: true,
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
			enum: GroupCategory,
			default: [],
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
