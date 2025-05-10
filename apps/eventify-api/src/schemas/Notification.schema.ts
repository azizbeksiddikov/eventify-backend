import { Schema } from 'mongoose';
import { NotificationType } from '../libs/enums/notification';

const NotificationSchema = new Schema(
	{
		// ===== References =====
		memberId: {
			type: Schema.Types.ObjectId,
			required: true,
		},

		receiverId: {
			type: Schema.Types.ObjectId,
			required: true,
		},

		notificationLink: {
			type: String,
			required: false,
		},

		// ===== Type and Status =====
		notificationType: {
			type: String,
			enum: NotificationType,
			required: true,
		},

		isRead: {
			type: Boolean,
			default: false,
		},
	},
	{ timestamps: true, collection: 'notifications' },
);

export default NotificationSchema;
