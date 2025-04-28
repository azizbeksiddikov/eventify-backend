import { registerEnumType } from '@nestjs/graphql';

// ===== Member Type =====
export enum MemberType {
	USER = 'USER',
	ADMIN = 'ADMIN',
	ORGANIZER = 'ORGANIZER',
}

// ===== Member Status =====
export enum MemberStatus {
	ACTIVE = 'ACTIVE',
	BLOCKED = 'BLOCKED',
}

// Register Member enums
registerEnumType(MemberType, { name: 'MemberType' });
registerEnumType(MemberStatus, { name: 'MemberStatus' });
