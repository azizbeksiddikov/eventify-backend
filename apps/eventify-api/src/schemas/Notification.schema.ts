import { Schema } from 'mongoose';
import { NotificationType } from '../libs/enums/notification';

const NotificationSchema = new Schema(
	{
		// ===== References =====
		senderId: {
			type: Schema.Types.ObjectId,
			required: true,
		},

		receiverId: {
			type: Schema.Types.ObjectId,
			required: true,
		},

		notificationRefId: {
			type: Schema.Types.ObjectId,
			required: true,
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
