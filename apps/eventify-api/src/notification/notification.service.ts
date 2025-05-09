import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';

// ===== DTOs =====
import { NotificationInput, NotificationsInquiry } from '../libs/dto/notification/notification.input';
import { Notifications } from '../libs/dto/notification/notification';
import { Notification } from '../libs/dto/notification/notification';
import { NotificationUpdate } from '../libs/dto/notification/notification.update';

// ===== Services =====
import { Direction, Message } from '../libs/enums/common.enum';
import { T } from '../libs/types/common';

@Injectable()
export class NotificationService {
	constructor(@InjectModel('Notification') private readonly notificationModel: Model<Notification>) {}
	// CRU

	public async createNotification(input: NotificationInput): Promise<Notification> {
		input.isRead = false;

		try {
			const notification = await this.notificationModel.create(input);
			return notification;
		} catch (error) {
			throw new BadRequestException(Message.CREATE_FAILED);
		}
	}

	public async getNotifications(input: NotificationsInquiry): Promise<Notifications> {
		const match = {
			receiverId: input.search?.receiverId,
			notificationType: input.search?.notificationType,
			isRead: input.search?.isRead,
		};
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		const notifications = await this.notificationModel.aggregate([
			{ $match: match },
			{ $sort: sort },
			{
				$facet: {
					list: [{ $skip: (input.page - 1) * input.limit }, { $limit: input.limit }],
					metaCounter: [{ $count: 'total' }],
				},
			},
		]);
		if (!notifications.length) throw new NotFoundException(Message.NO_DATA_FOUND);

		return notifications[0];
	}

	public async updateNotification(input: NotificationUpdate): Promise<Notification> {
		const notification = await this.notificationModel.findByIdAndUpdate(input._id, input, { new: true });
		if (!notification) throw new NotFoundException(Message.NO_DATA_FOUND);

		return notification;
	}
}
