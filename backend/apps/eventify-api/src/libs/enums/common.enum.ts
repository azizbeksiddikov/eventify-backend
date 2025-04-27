export enum MemberType {
	ADMIN = 'ADMIN',
	USER = 'USER',
	ORGANIZER = 'ORGANIZER',
}

export enum MemberStatus {
	ACTIVE = 'ACTIVE',
	BANNED = 'BANNED',
}

export enum MemberRole {
	ORGANIZER = 'ORGANIZER',
	MEMBER = 'MEMBER',
	BANNED = 'BANNED',
}

export enum EventStatus {
	ACTIVE = 'ACTIVE',
	CANCELLED = 'CANCELLED',
	COMPLETED = 'COMPLETED',
}

export enum TicketStatus {
	PURCHASED = 'PURCHASED',
	CANCELLED = 'CANCELLED',
	USED = 'USED',
}

export enum ReviewGroup {
	MEMBER = 'MEMBER',
	EVENT = 'EVENT',
	GROUP = 'GROUP',
}

export enum LikeGroup {
	MEMBER = 'MEMBER',
	EVENT = 'EVENT',
	GROUP = 'GROUP',
}

export enum ViewGroup {
	MEMBER = 'MEMBER',
	EVENT = 'EVENT',
	GROUP = 'GROUP',
}
