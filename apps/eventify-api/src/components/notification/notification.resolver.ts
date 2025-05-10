import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';

// Guards
import { AuthGuard } from '../../components/auth/guards/auth.guard';
import { UseGuards } from '@nestjs/common';

// Services
import { NotificationService } from './notification.service';

// DTOs
import { Notifications } from '../../libs/dto/notification/notification';
import { NotificationInput, NotificationsInquiry } from '../../libs/dto/notification/notification.input';
import { Notification } from '../../libs/dto/notification/notification';
import { NotificationUpdate } from '../../libs/dto/notification/notification.update';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { ObjectId } from 'mongoose';

@Resolver()
export class NotificationResolver {
	constructor(private readonly notificationService: NotificationService) {}

	@UseGuards(AuthGuard)
	@Mutation(() => Notification)
	async createNotification(@Args('input') input: NotificationInput): Promise<Notification> {
		console.log('Mutation: createNotification');
		return await this.notificationService.createNotification(input);
	}

	@UseGuards(AuthGuard)
	@Query(() => Notifications)
	async getNotifications(
		@Args('input') input: NotificationsInquiry,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Notifications> {
		console.log('Query: getNotifications');

		return await this.notificationService.getNotifications(memberId, input);
	}

	@UseGuards(AuthGuard)
	@Mutation(() => Notification)
	async updateNotification(
		@Args('input') input: NotificationUpdate,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Notification> {
		console.log('Mutation: updateNotification');

		return await this.notificationService.updateNotification(memberId, input);
	}

	@UseGuards(AuthGuard)
	@Mutation(() => Boolean)
	async readAllNotifications(@AuthMember('_id') memberId: ObjectId): Promise<boolean> {
		console.log('Mutation: readAllNotifications');
		await this.notificationService.readAllNotifications(memberId);
		return true;
	}
}
