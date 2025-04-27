import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { NotificationType } from '../libs/enums/common.enum';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
	@Prop({ required: true, ref: 'User' })
	userId: MongooseSchema.Types.ObjectId;

	@Prop({ type: String, enum: NotificationType, required: true })
	type: NotificationType;

	@Prop({ required: true })
	message: string;

	@Prop({ ref: 'Event' })
	eventId?: MongooseSchema.Types.ObjectId;

	@Prop({ ref: 'User' })
	senderId?: MongooseSchema.Types.ObjectId;

	@Prop({ type: Boolean, default: false })
	isRead: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
