import { registerEnumType } from '@nestjs/graphql';

export enum EventStatus {
	ACTIVE = 'ACTIVE',
	CANCELLED = 'CANCELLED',
	COMPLETED = 'COMPLETED',
}
registerEnumType(EventStatus, { name: 'EventStatus' });
