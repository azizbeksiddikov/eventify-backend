import { registerEnumType } from '@nestjs/graphql';

// ===== Event Type =====
export enum EventType {
	ONCE = 'ONCE',
	RECURRING = 'RECURRING',
}

// ===== Event Status =====
export enum EventStatus {
	UPCOMING = 'UPCOMING', // created but not yet started
	ONGOING = 'ONGOING', // started and ongoing
	COMPLETED = 'COMPLETED', // completed and ended

	CANCELLED = 'CANCELLED', // cancelled by the host
	DELETED = 'DELETED', // deleted by the host
}

// ===== Recurrence Type =====
export enum RecurrenceType {
	INTERVAL = 'INTERVAL', // Every N days
	DAYS_OF_WEEK = 'DAYS_OF_WEEK', // Weekly on specific days
	DAY_OF_MONTH = 'DAY_OF_MONTH', // Monthly on specific day
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
registerEnumType(EventType, { name: 'EventType' });
registerEnumType(EventStatus, { name: 'EventStatus' });
registerEnumType(EventCategory, { name: 'EventCategory' });
registerEnumType(RecurrenceType, { name: 'RecurrenceType' });
