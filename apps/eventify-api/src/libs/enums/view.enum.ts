import { registerEnumType } from '@nestjs/graphql';

// ===== View Group =====
export enum ViewGroup {
	MEMBER = 'MEMBER',
	EVENT = 'EVENT',
	GROUP = 'GROUP',
}

// Register View enum
registerEnumType(ViewGroup, { name: 'ViewGroup' });
