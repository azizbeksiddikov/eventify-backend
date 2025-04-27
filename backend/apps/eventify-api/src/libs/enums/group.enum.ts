import { registerEnumType } from '@nestjs/graphql';

export enum GroupType {
	PUBLIC = 'PUBLIC',
	PRIVATE = 'PRIVATE',
	RESTRICTED = 'RESTRICTED',
}

export enum GroupMemberRole {
	ADMIN = 'ADMIN',
	MODERATOR = 'MODERATOR',
	MEMBER = 'MEMBER',
}

export enum MemberRole {
	ORGANIZER = 'ORGANIZER',
	MEMBER = 'MEMBER',
	BANNED = 'BANNED',
}

// Register Group enums
registerEnumType(GroupType, { name: 'GroupType' });
registerEnumType(GroupMemberRole, { name: 'GroupMemberRole' });
registerEnumType(MemberRole, { name: 'MemberRole' });
