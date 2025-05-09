import { Field, InputType } from '@nestjs/graphql';
import { ObjectId } from 'mongoose';
import { IsNotEmpty, IsOptional } from 'class-validator';

@InputType()
export class NotificationUpdate {
	// ===== Identification =====
	@IsNotEmpty()
	@Field(() => String)
	_id: ObjectId;

	// ===== Type and Status =====
	@IsOptional()
	@Field(() => Boolean, { nullable: true })
	isRead?: boolean;
}
