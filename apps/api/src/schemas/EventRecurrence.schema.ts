import { Schema } from 'mongoose';
import { EventCategory, EventStatus, RecurrenceType, EventLocationType } from '../libs/enums/event.enum';

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
			required: false,
			default: null,
		},

		eventCity: {
			type: String,
			required: false,
			default: null,
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

		eventCurrency: {
			type: String,
			required: false,
			default: null,
			uppercase: true,
			trim: true,
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

		// ===== Location Details =====
		locationType: {
			type: String,
			enum: EventLocationType,
			required: true,
		},

		eventCoordinates: {
			type: {
				lat: {
					type: Number,
					required: false,
				},
				lon: {
					type: Number,
					required: false,
				},
			},
			required: false,
			default: null,
		},

		eventTags: {
			type: [String],
			required: true,
			default: [],
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
			default: 'internal',
		},

		isRealEvent: {
			type: Boolean,
			required: true,
			default: false,
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
