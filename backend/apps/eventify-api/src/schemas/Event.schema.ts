import { Schema } from 'mongoose';
import { EventStatus } from '../libs/enums/event.enum';

const EventSchema = new Schema(
	{
		eventName: {
			type: String,
			required: true,
		},
		eventDesc: {
			type: String,
			required: true,
		},
		eventDate: {
			type: Date,
			required: true,
		},
		eventStartTime: {
			type: String,
			required: true,
		},
		eventEndTime: {
			type: String,
			required: true,
		},
		eventAddress: {
			type: String,
			required: true,
		},
		eventOrganizerId: {
			type: Schema.Types.ObjectId,
			ref: 'Member',
			required: true,
		},
		eventCapacity: {
			type: Number,
			required: true,
		},
		attendeeCount: {
			type: Number,
			default: 0,
		},
		eventImage: {
			type: String,
			required: true,
		},
		eventStatus: {
			type: String,
			enum: EventStatus,
			default: EventStatus.ACTIVE,
		},
		groupId: {
			type: Schema.Types.ObjectId,
			ref: 'Group',
		},
		eventCategories: {
			type: [String],
			default: [],
		},
		eventLikes: {
			type: Number,
			default: 0,
		},
		eventViews: {
			type: Number,
			default: 0,
		},
	},
	{
		timestamps: true,
		collection: 'events',
	},
);

export default EventSchema;
