import { registerEnumType } from '@nestjs/graphql';

export enum NotificationType {
	EVENT = 'EVENT', // event created
	EVENT_JOIN = 'EVENT_JOIN', // event joined
	GROUP_JOIN = 'GROUP_JOIN', // group joined
	COMMENT = 'COMMENT',
	LIKE = 'LIKE',
	FOLLOW = 'FOLLOW',
}

// Register Notification enums
registerEnumType(NotificationType, { name: 'NotificationType' });
