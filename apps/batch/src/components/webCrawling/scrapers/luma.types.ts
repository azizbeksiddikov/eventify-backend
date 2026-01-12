/**
 * Type definitions for Luma event data structures
 */
export interface LumaTicketType {
	price?: number | string;
	amount?: number | string;
	currency?: string;
	name?: string;
}

export interface LumaGeoAddressInfo {
	city?: string;
	full_address?: string;
	short_address?: string;
	address?: string;
	mode?: string;
	description?: string;
}

export interface LumaCoordinate {
	latitude?: number | string;
	longitude?: number | string;
}

export interface LumaEvent {
	api_id?: string;
	event_id?: string;
	id?: string;
	name?: string;
	title?: string;
	description?: string;
	summary?: string;
	url?: string;
	event_url?: string;
	cover_url?: string;
	start_at?: string;
	startAt?: string;
	start?: string;
	start_time?: string;
	end_at?: string;
	endAt?: string;
	location_type?: string;
	timezone?: string;
	calendar?: unknown;
	geo_address_info?: LumaGeoAddressInfo;
	coordinate?: LumaCoordinate;
	ticket_types?: LumaTicketType[];
	tickets?: LumaTicketType[];
	price?: number | string;
	currency?: string;
	tags?: string[] | Array<{ name?: string }>;
	topics?: string[] | Array<{ name?: string }>;
	categories?: string[] | Array<{ name?: string }>;
	guest_limit?: number | string;
	guest_count?: number | string;
	guests_count?: number | string;
	attendee_count?: number | string;
	raw_html?: string;
	[key: string]: unknown;
}

export interface LumaPageData {
	place?: {
		event_count?: number;
	};
	events?: LumaEvent[];
	featured_events?: LumaEvent[];
}

export interface LumaPageProps {
	props?: {
		pageProps?: {
			initialData?: {
				data?: LumaPageData;
			};
		};
	};
}

export type LumaJsonData = LumaEvent | LumaPageProps | LumaPageData | Record<string, unknown>;
