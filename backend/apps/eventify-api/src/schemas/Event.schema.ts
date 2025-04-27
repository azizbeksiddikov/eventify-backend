import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { EventStatus } from '../libs/enums/common.enum';

export type EventDocument = Event & Document;

@Schema({ timestamps: true })
export class Event {
	@Prop({ required: true })
	eventName: string;

	@Prop()
	eventDesc?: string;

	@Prop({ required: true })
	eventDate: Date;

	@Prop({ required: true })
	eventStartTime: string;

	@Prop({ required: true })
	eventEndTime: string;

	@Prop({ required: true })
	eventAddress: string;

	@Prop({ required: true, ref: 'User' })
	eventOrganizerId: MongooseSchema.Types.ObjectId;

	@Prop({ required: true })
	eventCapacity: number;

	@Prop({ type: Number, default: 0 })
	attendeeCount: number;

	@Prop()
	eventImage?: string;

	@Prop({ type: String, enum: EventStatus, default: EventStatus.ACTIVE })
	eventStatus: EventStatus;

	@Prop({ ref: 'Group' })
	groupId?: MongooseSchema.Types.ObjectId;

	@Prop({ type: [String], default: [] })
	eventCategories: string[];

	@Prop({ type: Number, default: 0 })
	eventLikes: number;

	@Prop({ type: Number, default: 0 })
	eventViews: number;
}

export const EventSchema = SchemaFactory.createForClass(Event);
