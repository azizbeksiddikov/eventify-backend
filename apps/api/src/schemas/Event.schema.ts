import { Schema } from 'mongoose';
import { EventCategory, EventStatus, EventType, EventLocationType } from '../libs/enums/event.enum';
import { Currency } from '../libs/enums/common.enum';

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
		},

		eventDesc: {
			type: String,
			required: true,
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

		// ===== Location Details =====
		locationType: {
			type: String,
			enum: EventLocationType,
			required: true,
		},

		eventCity: {
			type: String,
			required: false,
			default: null,
		},

		eventAddress: {
			type: String,
			required: false,
			default: null,
		},

		coordinateLatitude: {
			type: Number,
			required: false,
		},

		coordinateLongitude: {
			type: Number,
			required: false,
		},

		// ===== Event Details =====
		eventCapacity: {
			type: Number,
			required: false,
			default: null,
		},

		eventPrice: {
			type: Number,
			default: 0,
			min: 0,
		},

		eventCurrency: {
			type: String,
			enum: Currency,
			required: false,
			default: null,
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

		eventTags: {
			type: [String],
			required: true,
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
			required: false,
			default: null,
		},

		// ===== External Source Information =====
		origin: {
			type: String,
			default: 'internal',
		},

		externalId: {
			type: String,
			required: false,
			default: null,
		},

		externalUrl: {
			type: String,
			required: false,
			default: null,
		},

		isRealEvent: {
			type: Boolean,
			required: true,
			default: false,
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
