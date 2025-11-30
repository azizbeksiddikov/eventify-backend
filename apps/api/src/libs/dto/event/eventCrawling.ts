import { EventCategory, EventStatus, EventType } from '../../enums/event.enum';

export class CrawledEvent {
	// ===== Event Type =====
	eventType?: EventType;

	// ===== Basic Information =====
	eventName: string;
	eventDesc: string;
	eventImages: string[];

	// ===== Event Timestamps =====
	eventStartAt: Date;
	eventEndAt: Date;

	// ===== Event Details =====
	// eventCity: string;
	// eventAddress: string;
	eventPrice: number; // default is 0

	// ===== Type and Status =====
	eventStatus?: EventStatus;
	eventCategories: EventCategory[];

	// ===== References =====
	groupId?: string;

	// Event Attendees
	attendeeCount: number; // default is 0
	eventCapacity?: number; // default is null

	// additional fields
	eventUrl?: string;
	location?: EventLocation;

	// Just in case (for debugging)
	rawData?: any;
}

export interface EventLocation {
	type: 'online' | 'offline';
	eventCity?: string;
	address?: string;
}

export interface ScraperConfig {
	name: string; // meetup, eventbrite, etc.
	baseUrl: string;
	searchUrl: string;
	maxPages?: number;
	userAgent?: string;
}

export interface IEventScraper {
	scrapeEvents(): Promise<CrawledEvent[]>;
	getName(): string;
}
