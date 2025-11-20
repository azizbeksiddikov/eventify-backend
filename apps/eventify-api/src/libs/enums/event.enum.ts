import { registerEnumType } from '@nestjs/graphql';

// ===== Event Status =====
export enum EventStatus {
	UPCOMING = 'UPCOMING', // created but not yet started
	ONGOING = 'ONGOING', // started and ongoing
	COMPLETED = 'COMPLETED', // completed and ended
	CANCELLED = 'CANCELLED', // cancelled by the host
	DELETED = 'DELETED', // deleted by the host
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
