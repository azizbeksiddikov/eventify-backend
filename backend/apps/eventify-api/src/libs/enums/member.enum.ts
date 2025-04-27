import { registerEnumType } from '@nestjs/graphql';

export enum MemberType {
	USER = 'USER',
	ADMIN = 'ADMIN',
	ORGANIZER = 'ORGANIZER',
}

export enum MemberStatus {
	ACTIVE = 'ACTIVE',
	BLOCKED = 'BLOCKED',
}
// Register Member enums
registerEnumType(MemberType, { name: 'MemberType' });
registerEnumType(MemberStatus, { name: 'MemberStatus' });
