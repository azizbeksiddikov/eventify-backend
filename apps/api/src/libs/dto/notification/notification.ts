import { Field, Int, ObjectType } from '@nestjs/graphql';
import { ObjectId } from 'mongoose';
import { NotificationType } from '../../enums/notification.enum';
import { Member, TotalCounter } from '../member/member';

@ObjectType()
export class Notification {
	// ===== Basic Information =====
	@Field(() => String)
	_id: ObjectId;

	// ===== References =====
	@Field(() => String)
	memberId: ObjectId;

	@Field(() => String)
	receiverId: ObjectId;

	@Field(() => String, { nullable: true })
	notificationLink?: string;

	// ===== Type and Status =====
	@Field(() => NotificationType)
	notificationType: NotificationType;

	@Field(() => Boolean)
	isRead: boolean;

	// ===== Timestamps =====
	@Field(() => Date)
	createdAt: Date;

	@Field(() => Date)
	updatedAt: Date;

	// ===== Aggregated Information =====
	@Field(() => Member, { nullable: true })
	memberData?: Member;
}

@ObjectType()
export class Notifications {
	@Field(() => [Notification])
	list: Notification[];

	@Field(() => [TotalCounter])
	metaCounter: TotalCounter[];
}
