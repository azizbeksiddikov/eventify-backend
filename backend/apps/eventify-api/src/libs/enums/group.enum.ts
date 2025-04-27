import { registerEnumType } from '@nestjs/graphql';

export enum GroupMemberRole {
	OWNER = 'OWNER',
	MODERATOR = 'MODERATOR',
	MEMBER = 'MEMBER',
	BANNED = 'BANNED',
}

export enum GroupCategory {
	SPORTS = 'SPORTS',
	ART = 'ART',
	TECHNOLOGY = 'TECHNOLOGY',
	FOOD = 'FOOD',
	TRAVEL = 'TRAVEL',
	EDUCATION = 'EDUCATION',
	HEALTH = 'HEALTH',
	ENTERTAINMENT = 'ENTERTAINMENT',
	BUSINESS = 'BUSINESS',
	POLITICS = 'POLITICS',
	RELIGION = 'RELIGION',
	OTHER = 'OTHER',
}

// Register Group enums
registerEnumType(GroupMemberRole, { name: 'GroupMemberRole' });
registerEnumType(GroupCategory, { name: 'GroupCategory' });
