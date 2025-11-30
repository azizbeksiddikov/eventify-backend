import { EventCategory, EventStatus, EventType, EventLocationType } from '../../enums/event.enum';

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
	eventTimezone?: string;

	// ===== Location Details =====
	locationType?: EventLocationType;
	eventCity?: string;
	eventAddress?: string;
	eventCoordinates?: {
		lat: number;
		lon: number;
	};

	// ===== Event Details =====
	eventPrice: number; // default is 0

	// ===== Type and Status =====
	eventStatus?: EventStatus;
	eventCategories: EventCategory[];
	eventTags?: string[];

	// ===== External Source Information =====
	externalId?: string; // Original event ID from external platform
	externalUrl?: string; // Link to original event page

	// ===== References =====
	groupId?: string;

	// Event Attendees
	attendeeCount: number; // default is 0
	eventCapacity?: number; // default is null

	// additional fields
	eventUrl?: string; // Deprecated: use externalUrl instead
	location?: EventLocation; // Deprecated: use locationType, eventCity, eventAddress instead

	// ===== Data Storage =====
	isRealEvent: boolean; // default is false
	rawData?: any; // Just in case (for debugging)
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
