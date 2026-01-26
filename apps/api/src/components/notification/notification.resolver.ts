import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';

// Guards
import { AuthGuard } from '../auth/guards/auth.guard';
import { UseGuards } from '@nestjs/common';

// Services
import { NotificationService } from './notification.service';

// DTOs
import { Notifications } from '../../libs/dto/notification/notification';
import { NotificationInput, NotificationsInquiry } from '../../libs/dto/notification/notification.input';
import { Notification } from '../../libs/dto/notification/notification';
import { NotificationUpdate } from '../../libs/dto/notification/notification.update';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import type { ObjectId } from 'mongoose';
import { logger } from '../../libs/logger';

@Resolver()
export class NotificationResolver {
	constructor(private readonly notificationService: NotificationService) {}

	@UseGuards(AuthGuard)
	@Mutation(() => Notification)
	async createNotification(@Args('input') input: NotificationInput): Promise<Notification> {
		logger.debug('NotificationResolver', 'Mutation: createNotification');
		return await this.notificationService.createNotification(input);
	}

	@UseGuards(AuthGuard)
	@Query(() => Notifications)
	async getNotifications(
		@Args('input') input: NotificationsInquiry,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Notifications> {
		logger.debug('NotificationResolver', 'Query: getNotifications');

		return await this.notificationService.getNotifications(memberId, input);
	}

	@UseGuards(AuthGuard)
	@Mutation(() => Notification)
	async updateNotification(
		@Args('input') input: NotificationUpdate,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Notification> {
		logger.debug('NotificationResolver', 'Mutation: updateNotification');

		return await this.notificationService.updateNotification(memberId, input);
	}

	@UseGuards(AuthGuard)
	@Mutation(() => Boolean)
	async readAllNotifications(@AuthMember('_id') memberId: ObjectId): Promise<boolean> {
		logger.debug('NotificationResolver', 'Mutation: readAllNotifications');
		await this.notificationService.readAllNotifications(memberId);
		return true;
	}
}
