import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CategoryDocument = Category & Document;

@Schema({ timestamps: true })
export class Category {
	@Prop({ required: true, unique: true })
	name: string;

	@Prop({ type: String })
	description?: string;

	@Prop({ type: String })
	icon?: string;

	@Prop({ type: Number, default: 0 })
	eventCount: number;

	@Prop({ type: Boolean, default: true })
	isActive: boolean;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
