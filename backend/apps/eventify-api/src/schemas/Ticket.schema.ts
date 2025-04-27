import { Schema } from 'mongoose';
import { TicketStatus } from '../libs/enums/ticket.enum';

const TicketSchema = new Schema(
	{
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
		ticketStatus: {
			type: String,
			enum: TicketStatus,
			default: TicketStatus.PURCHASED,
			required: true,
		},
		ticketPrice: {
			type: Number,
			required: true,
		},
	},
	{
		timestamps: true,
		collection: 'tickets',
	},
);

// Create compound index for eventId and memberId
TicketSchema.index({ eventId: 1, memberId: 1 }, { unique: true });

export default TicketSchema;
