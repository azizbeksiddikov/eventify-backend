import { registerEnumType } from '@nestjs/graphql';

// ===== Comment Status =====
export enum CommentStatus {
	ACTIVE = 'ACTIVE',
	DELETE = 'DELETE',
}

// ===== Comment Group =====
export enum CommentGroup {
	MEMBER = 'MEMBER',
	EVENT = 'EVENT',
	GROUP = 'GROUP',
}

// Register Comment enums
registerEnumType(CommentStatus, { name: 'CommentStatus' });
registerEnumType(CommentGroup, { name: 'CommentGroup' });
