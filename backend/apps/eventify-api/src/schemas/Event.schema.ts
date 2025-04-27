import { Schema } from 'mongoose';
import { EventStatus } from '../libs/enums/event.enum';

const EventSchema = new Schema(
	{
		eventName: {
			type: String,
			required: true,
			maxlength: 100,
		},
		eventDesc: {
			type: String,
			required: true,
			maxlength: 2000,
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
			maxlength: 500,
		},
		eventOrganizerId: {
			type: Schema.Types.ObjectId,
			ref: 'Member',
			required: true,
		},
		eventCapacity: {
			type: Number,
			required: true,
			min: 1,
		},
		attendeeCount: {
			type: Number,
			default: 0,
			min: 0,
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
			min: 0,
		},
		eventViews: {
			type: Number,
			default: 0,
			min: 0,
		},
		eventPrice: {
			type: Number,
			default: 0,
			min: 0,
		},
		eventLocation: {
			type: String,
		},
	},
	{
		timestamps: true,
		collection: 'events',
	},
);

export default EventSchema;
