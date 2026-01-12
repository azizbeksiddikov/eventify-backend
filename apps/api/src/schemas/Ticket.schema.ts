import { Schema } from 'mongoose';
import { TicketStatus } from '../libs/enums/ticket.enum';

const TicketSchema = new Schema(
	{
		// ===== References =====
		eventId: {
			type: Schema.Types.ObjectId,
			ref: 'Event',
			required: true,
		},
		memberId: {
			type: Schema.Types.ObjectId,
			ref: 'Member',
			required: true,
		},

		// ===== Type and Status =====
		ticketStatus: {
			type: String,
			enum: TicketStatus,
			default: TicketStatus.PURCHASED,
			required: true,
		},

		// ===== Pricing =====
		ticketPrice: {
			type: Number,
			required: true,
		},

		ticketCurrency: {
			type: String,
			required: true,
			uppercase: true,
			trim: true,
		},

		ticketQuantity: {
			type: Number,
			required: true,
		},

		totalPrice: {
			type: Number,
			required: true,
		},
	},
	{
		timestamps: true,
		collection: 'tickets',
	},
);

export default TicketSchema;
