import { registerEnumType } from '@nestjs/graphql';

export enum NotificationType {
	// event
	CREATE_EVENT = 'CREATE_EVENT',
	JOIN_EVENT = 'JOIN_EVENT',
	LIKE_EVENT = 'LIKE_EVENT',
	COMMENT_EVENT = 'COMMENT_EVENT',
	// group
	JOIN_GROUP = 'JOIN_GROUP',
	LIKE_GROUP = 'LIKE_GROUP',
	COMMENT_GROUP = 'COMMENT_GROUP',
	// member
	LIKE_MEMBER = 'LIKE_MEMBER',
	COMMENT_MEMBER = 'COMMENT_MEMBER',
	FOLLOW_MEMBER = 'FOLLOW_MEMBER',
}

// Register Notification enums
registerEnumType(NotificationType, { name: 'NotificationType' });
