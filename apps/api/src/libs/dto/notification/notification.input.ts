import type { ObjectId } from 'mongoose';
import { Field, InputType, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, Min } from 'class-validator';
import { Direction } from '../../enums/common.enum';
import { NotificationType } from '../../enums/notification.enum';

@InputType()
export class NotificationInput {
	// ===== References =====
	@IsNotEmpty()
	@Field(() => String)
	memberId: ObjectId;

	@IsNotEmpty()
	@Field(() => String)
	receiverId: ObjectId;

	@IsOptional()
	@Field(() => String, { nullable: true })
	notificationLink?: string;

	// ===== Type and Status =====
	@IsNotEmpty()
	@Field(() => NotificationType)
	notificationType: NotificationType;

	@IsOptional()
	@Field(() => Boolean, { nullable: true })
	isRead?: boolean;
}

// ============== Notification Search Input ==============
@InputType()
export class NISearch {
	@IsOptional()
	@Field(() => String, { nullable: true })
	receiverId?: ObjectId;

	@IsOptional()
	@Field(() => NotificationType, { nullable: true })
	notificationType?: NotificationType;

	@IsOptional()
	@Field(() => Boolean, { nullable: true })
	isRead?: boolean;
}

// ============== Inquiry Inputs ==============
@InputType()
export class NotificationsInquiry {
	// ===== Pagination =====
	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	page: number;

	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	limit: number;

	// ===== Sorting =====
	@IsOptional()
	@Field(() => String, { nullable: true })
	sort?: string;

	@IsOptional()
	@Field(() => Direction, { nullable: true })
	direction?: Direction;

	// ===== Search =====
	@IsNotEmpty()
	@Field(() => NISearch)
	search: NISearch;
}
