/**
 * Type definitions for Meetup event data structures
 */
export interface MeetupVenue {
	address?: string;
	name?: string;
	city?: string;
	lat?: number | string;
	lng?: number | string;
}

export interface MeetupTopic {
	name?: string;
	[key: string]: unknown;
}

export interface MeetupGroup {
	topics?: MeetupTopic[];
	groupPhoto?:
		| {
				source?: string;
				[key: string]: unknown;
		  }
		| string;
	[key: string]: unknown;
}

export interface MeetupFeeSettings {
	amount?: number | string;
	currency?: string;
	[key: string]: unknown;
}

export interface MeetupEvent {
	__typename?: string;
	id?: string;
	title?: string;
	description?: string;
	dateTime?: string;
	endTime?: string;
	eventUrl?: string;
	eventType?: string;
	isOnline?: boolean;
	venue?: MeetupVenue;
	feeSettings?: MeetupFeeSettings;
	maxTickets?: number | string;
	goingCount?: {
		totalCount?: number;
		[key: string]: unknown;
	};
	featuredEventPhoto?:
		| {
				source?: string;
				[key: string]: unknown;
		  }
		| string;
	group?: MeetupGroup;
	topics?: MeetupTopic[];
	raw_html?: string;
	[key: string]: unknown;
}
