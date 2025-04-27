import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { ReviewGroup } from '../libs/enums/common.enum';

export type ReviewDocument = Review & Document;

@Schema({ timestamps: true })
export class Review {
	@Prop({ required: true, ref: 'User' })
	memberId: MongooseSchema.Types.ObjectId;

	@Prop({ type: String, enum: ReviewGroup, required: true })
	reviewGroup: ReviewGroup;

	@Prop({ required: true })
	reviewRefId: MongooseSchema.Types.ObjectId;

	@Prop({ type: Number, required: true, min: 1, max: 5 })
	rating: number;

	@Prop()
	comment?: string;

	@Prop({ type: [String], default: [] })
	images?: string[];

	@Prop({ type: Boolean, default: false })
	isVerified: boolean;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);
