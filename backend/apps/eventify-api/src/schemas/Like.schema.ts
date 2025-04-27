import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { LikeGroup } from '../libs/enums/common.enum';

export type LikeDocument = Like & Document;

@Schema({ timestamps: true })
export class Like {
	@Prop({ required: true, ref: 'User' })
	memberId: MongooseSchema.Types.ObjectId;

	@Prop({ type: String, enum: LikeGroup, required: true })
	likeGroup: LikeGroup;

	@Prop({ required: true })
	likeRefId: MongooseSchema.Types.ObjectId;
}

export const LikeSchema = SchemaFactory.createForClass(Like);
