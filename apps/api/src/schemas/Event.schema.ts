import { Schema } from 'mongoose';
import { EventCategory, EventStatus, EventType } from '../libs/enums/event.enum';

const EventSchema = new Schema(
	{
		// ===== Event Type =====
		eventType: {
			type: String,
			enum: EventType,
			default: EventType.ONCE,
		},

		recurrenceId: {
			type: Schema.Types.ObjectId,
			ref: 'EventRecurrence',
			required: false,
			default: null,
		},

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

		eventImages: {
			type: [String],
			required: true,
			default: [],
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
			required: false,
			default: null,
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
			required: false,
			default: null,
		},

		memberId: {
			type: Schema.Types.ObjectId,
			ref: 'Member',
			required: true,
		},

		// ===== Origin =====
		origin: {
			type: String,
			default: 'eventify.azbek.me',
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
