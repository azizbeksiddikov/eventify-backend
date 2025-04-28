import { registerEnumType } from '@nestjs/graphql';

// ===== Event Status =====
export enum EventStatus {
	UPCOMING = 'UPCOMING',
	ONGOING = 'ONGOING',
	COMPLETED = 'COMPLETED',
	CANCELLED = 'CANCELLED',
	DELETED = 'DELETED',
}

// ===== Event Category =====
export enum EventCategory {
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

// Register Event enums
registerEnumType(EventStatus, { name: 'EventStatus' });
registerEnumType(EventCategory, { name: 'EventCategory' });
