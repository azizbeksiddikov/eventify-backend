import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsEnum } from 'class-validator';

export enum NotificationType {
	EVENT_INVITATION = 'EVENT_INVITATION',
	EVENT_UPDATE = 'EVENT_UPDATE',
	TICKET_PURCHASE = 'TICKET_PURCHASE',
	REVIEW = 'REVIEW',
	FOLLOW = 'FOLLOW',
	MESSAGE = 'MESSAGE',
}

@ObjectType()
export class Notification {
	@Field()
	_id: string;

	@Field()
	userId: string;

	@Field()
	type: NotificationType;

	@Field()
	message: string;

	@Field({ nullable: true })
	eventId?: string;

	@Field({ nullable: true })
	senderId?: string;

	@Field()
	isRead: boolean;

	@Field()
	createdAt: Date;
}

@InputType()
export class CreateNotificationDto {
	@Field()
	@IsString()
	@IsNotEmpty()
	userId: string;

	@Field()
	@IsEnum(NotificationType)
	@IsNotEmpty()
	type: NotificationType;

	@Field()
	@IsString()
	@IsNotEmpty()
	message: string;

	@Field({ nullable: true })
	@IsString()
	eventId?: string;

	@Field({ nullable: true })
	@IsString()
	senderId?: string;
}

@InputType()
export class UpdateNotificationDto {
	@Field({ nullable: true })
	@IsString()
	message?: string;

	@Field({ nullable: true })
	isRead?: boolean;
}
