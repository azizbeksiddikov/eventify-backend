import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';

// ===== DTOs =====
import { NotificationInput, NotificationsInquiry } from '../../libs/dto/notification/notification.input';
import { Notifications } from '../../libs/dto/notification/notification';
import { Notification } from '../../libs/dto/notification/notification';
import { NotificationUpdate } from '../../libs/dto/notification/notification.update';

// ===== Services =====
import { Direction, Message } from '../../libs/enums/common.enum';
import { T } from '../../libs/types/common';
import { lookupMember, shapeIntoMongoObjectId } from '../../libs/config';

@Injectable()
export class NotificationService {
	constructor(@InjectModel('Notification') private readonly notificationModel: Model<Notification>) {}

	public async createNotification(input: NotificationInput): Promise<Notification> {
		input.isRead = false;

		try {
			const notification = await this.notificationModel.create(input);
			return notification;
		} catch {
			throw new BadRequestException(Message.CREATE_FAILED);
		}
	}

	/**
	 * Creates or updates a notification to prevent duplicates.
	 * Uses upsert to ensure only one notification exists per unique combination
	 * of memberId, receiverId, notificationType, and notificationLink.
	 * If the notification already exists, it updates the timestamp (making it appear fresh).
	 */
	public async upsertNotification(input: NotificationInput): Promise<Notification> {
		try {
			const filter: T = {
				memberId: input.memberId,
				receiverId: input.receiverId,
				notificationType: input.notificationType,
				notificationLink: input.notificationLink,
			};

			const update = {
				$set: {
					...input,
					isRead: false,
				},
			};

			const notification = await this.notificationModel.findOneAndUpdate(filter, update, {
				upsert: true,
				new: true,
			});

			return notification;
		} catch {
			throw new BadRequestException(Message.CREATE_FAILED);
		}
	}

	public async getNotifications(memberId: ObjectId, input: NotificationsInquiry): Promise<Notifications> {
		const match: T = { receiverId: memberId };
		if (input.search?.notificationType) match.notificationType = input.search.notificationType;
		if (input.search?.isRead !== undefined) {
			match.isRead = input.search.isRead;
		}
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		const result = await this.notificationModel.aggregate<Notifications>([
			{ $match: match },
			{ $sort: sort },
			{
				$facet: {
					list: [
						{ $skip: (input.page - 1) * input.limit },
						{ $limit: input.limit },
						lookupMember,
						{ $unwind: '$memberData' },
					],
					metaCounter: [{ $count: 'total' }],
				},
			},
		]);
		if (!result.length) throw new NotFoundException(Message.NO_DATA_FOUND);

		return result[0];
	}

	public async updateNotification(memberId: ObjectId, input: NotificationUpdate): Promise<Notification> {
		const notificationId = shapeIntoMongoObjectId(input._id);

		const match: T = {
			_id: notificationId,
			receiverId: memberId,
		};
		const notification = await this.notificationModel.findOneAndUpdate(match, input, { new: true });
		if (!notification) throw new NotFoundException(Message.NO_DATA_FOUND);

		return notification;
	}

	public async readAllNotifications(memberId: ObjectId): Promise<void> {
		await this.notificationModel.updateMany({ receiverId: memberId }, { isRead: true });
	}
}
