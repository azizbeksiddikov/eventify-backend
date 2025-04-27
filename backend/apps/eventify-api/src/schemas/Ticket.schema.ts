import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { TicketStatus } from '../libs/enums/common.enum';

export type TicketDocument = Ticket & Document;

@Schema({ timestamps: true })
export class Ticket {
	@Prop({ required: true, ref: 'Event' })
	eventId: MongooseSchema.Types.ObjectId;

	@Prop({ required: true, ref: 'User' })
	memberId: MongooseSchema.Types.ObjectId;

	@Prop({ type: String, enum: TicketStatus, default: TicketStatus.PURCHASED })
	ticketStatus: TicketStatus;

	@Prop({ type: Number, required: true })
	ticketPrice: number;
}

export const TicketSchema = SchemaFactory.createForClass(Ticket);
