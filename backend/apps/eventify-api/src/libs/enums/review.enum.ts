import { registerEnumType } from '@nestjs/graphql';

export enum ReviewGroup {
	MEMBER = 'MEMBER',
	EVENT = 'EVENT',
	GROUP = 'GROUP',
}

// Register Review enum
registerEnumType(ReviewGroup, { name: 'ReviewGroup' });
