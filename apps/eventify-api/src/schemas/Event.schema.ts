import { Schema } from 'mongoose';
import { EventCategory, EventStatus } from '../libs/enums/event.enum';

const EventSchema = new Schema(
	{
		// ===== Basic Information =====
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

		eventImage: {
			type: String,
			required: true,
		},

		// ===== Event Timestamps =====
		eventStartAt: {
			type: Date,
			required: true,
		},

		eventEndAt: {
			type: Date,
			required: true,
		},

		// ===== Event Details =====
		eventAddress: {
			type: String,
			required: true,
			maxlength: 200,
		},
		eventCity: {
			type: String,
			required: true,
			maxlength: 100,
		},

		eventCapacity: {
			type: Number,
			required: true,
			min: 1,
		},

		eventPrice: {
			type: Number,
			default: 0,
			min: 0,
		},

		// ===== Type and Status =====
		eventStatus: {
			type: String,
			enum: EventStatus,
			default: EventStatus.UPCOMING,
		},

		eventCategories: {
			type: [String],
			enum: EventCategory,
			default: [],
		},

		// ===== References =====
		groupId: {
			type: Schema.Types.ObjectId,
			ref: 'Group',
			required: true,
		},

		memberId: {
			type: Schema.Types.ObjectId,
			ref: 'Member',
			required: true,
		},

		// ===== Statistics =====
		attendeeCount: {
			type: Number,
			default: 0,
			min: 0,
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
	},
	{
		timestamps: true,
		collection: 'events',
	},
);

export default EventSchema;
