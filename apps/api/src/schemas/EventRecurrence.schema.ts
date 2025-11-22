import { Schema } from 'mongoose';
import { EventCategory, EventStatus, RecurrenceType } from '../libs/enums/event.enum';

const EventRecurrenceSchema = new Schema(
	{
		// ===== Recurrence Rules =====
		recurrenceType: {
			type: String,
			enum: RecurrenceType,
			required: true,
		},

		recurrenceInterval: {
			type: Number,
			required: false,
		},

		recurrenceDaysOfWeek: {
			type: [Number],
			required: false,
		},

		recurrenceDayOfMonth: {
			type: Number,
			required: false,
		},

		recurrenceEndDate: {
			type: Date,
			required: false,
			default: null,
		},

		// ===== Template Fields (All Event fields) =====
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

		eventCategories: {
			type: [String],
			enum: EventCategory,
			default: [],
		},

		eventStatus: {
			type: String,
			enum: EventStatus,
			default: EventStatus.UPCOMING,
		},

		// ===== First Occurrence Template =====
		eventStartAt: {
			type: Date,
			required: true,
		},

		eventEndAt: {
			type: Date,
			required: true,
		},

		// ===== Ownership =====
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

		// ===== Status =====
		isActive: {
			type: Boolean,
			default: true,
		},
	},
	{
		timestamps: true,
		collection: 'eventRecurrences',
	},
);

export default EventRecurrenceSchema;
