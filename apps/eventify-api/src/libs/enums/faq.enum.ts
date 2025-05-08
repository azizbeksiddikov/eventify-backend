import { registerEnumType } from '@nestjs/graphql';

export enum FaqGroup {
	ACCOUNT = 'ACCOUNT',
	EVENTS = 'EVENTS',
	GROUPS = 'GROUPS',
}

export enum FaqStatus {
	ACTIVE = 'ACTIVE',
	INACTIVE = 'INACTIVE',
}

// Register FaqGroup enums
registerEnumType(FaqGroup, { name: 'FaqGroup' });
registerEnumType(FaqStatus, { name: 'FaqStatus' });
