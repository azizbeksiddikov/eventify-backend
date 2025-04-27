import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type FollowDocument = Follow & Document;

@Schema({ timestamps: true })
export class Follow {
	@Prop({ required: true, ref: 'User' })
	followerId: MongooseSchema.Types.ObjectId;

	@Prop({ required: true, ref: 'User' })
	followingId: MongooseSchema.Types.ObjectId;

	@Prop({ type: Boolean, default: true })
	isActive: boolean;
}

export const FollowSchema = SchemaFactory.createForClass(Follow);
