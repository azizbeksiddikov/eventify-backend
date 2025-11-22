import { Field, ObjectType } from '@nestjs/graphql';
import { ViewGroup } from '../../enums/view.enum';
import type { ObjectId } from 'mongoose';

@ObjectType()
export class View {
	// ===== Basic Information =====
	@Field(() => String)
	_id: ObjectId;

	// ===== Type and Group =====
	@Field(() => ViewGroup)
	viewGroup: ViewGroup;

	// ===== References =====
	@Field(() => String)
	memberId: ObjectId;

	@Field(() => String)
	viewRefId: ObjectId;

	// ===== Timestamps =====
	@Field(() => Date)
	createdAt: Date;

	@Field(() => Date)
	updatedAt: Date;
}
