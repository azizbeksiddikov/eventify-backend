import { registerEnumType } from '@nestjs/graphql';

// ===== Like Group =====
export enum LikeGroup {
	MEMBER = 'MEMBER',
	EVENT = 'EVENT',
	GROUP = 'GROUP',
}

// Register Like enum
registerEnumType(LikeGroup, { name: 'LikeGroup' });
