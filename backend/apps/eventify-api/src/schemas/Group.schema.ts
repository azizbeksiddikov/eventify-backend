import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type GroupDocument = Group & Document;

@Schema({ timestamps: true })
export class Group {
	@Prop({ required: true })
	groupName: string;

	@Prop()
	groupDesc?: string;

	@Prop()
	groupImage?: string;

	@Prop({ type: Number, default: 0 })
	groupViews: number;

	@Prop({ type: Number, default: 0 })
	groupLikes: number;

	@Prop({ type: [String], default: [] })
	groupCategories: string[];
}

export const GroupSchema = SchemaFactory.createForClass(Group);
