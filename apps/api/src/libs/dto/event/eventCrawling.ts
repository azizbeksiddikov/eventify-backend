import { EventCategory, EventStatus, EventType, EventLocationType } from '../../enums/event.enum';
import { Currency } from '../../enums/common.enum';

export class CrawledEvent {
	// ===== Event Type =====
	eventType?: EventType;

	// ===== Basic Information =====
	eventName: string;
	eventDesc: string;
	eventImages: string[];
	eventPrice?: number; // default is 0
	eventCurrency?: Currency;

	// ===== Event Timestamps =====
	eventStartAt: Date;
	eventEndAt: Date;

	// ===== Location Details =====
	locationType: EventLocationType;
	eventCity?: string;
	eventAddress?: string;
	coordinateLatitude?: number;
	coordinateLongitude?: number;

	// ===== Type and Status =====
	eventStatus?: EventStatus;
	eventCategories: EventCategory[];
	eventTags?: string[];
	isRealEvent: boolean; // default is false

	// ===== External Source Information =====
	origin?: string;
	externalId?: string; // Original event ID from external platform
	externalUrl?: string; // Link to original event page

	// ===== References =====
	groupId?: string;

	// ===== Event Attendees =====
	attendeeCount?: number; // default is 0
	eventCapacity?: number; // default is null

	// ===== Data Storage =====
	rawData?: any; // for debugging and LLM input
}

export interface ScraperConfig {
	name: string; // meetup, eventbrite, etc.
	baseUrl: string;
	searchUrl: string;
	maxPages?: number;
	userAgent?: string;
}

export interface IEventScraper {
	scrapeEvents(limit?: number): Promise<CrawledEvent[]>;
	getName(): string;
}
