import { registerEnumType } from '@nestjs/graphql';

// ===== Messages =====
export enum Message {
	// ===== General Messages =====
	SOMETHING_WENT_WRONG = 'Something went wrong. Please try again later.',
	NO_DATA_FOUND = 'No data found for your request.',
	CREATE_FAILED = 'Failed to create the record. Please try again.',
	UPDATE_FAILED = 'Failed to update the record. Please try again.',
	REMOVE_FAILED = 'Failed to remove the record. Please try again.',
	UPLOAD_FAILED = 'Failed to upload the file. Please try again.',
	BAD_REQUEST = 'Invalid request. Please check your input.',

	// ===== Member Related Messages =====
	MEMBER_NOT_FOUND = 'Member not found.',
	USED_MEMBER_NICK_OR_PHONE = 'Username or phone number is already in use.',
	NO_MEMBER_NICK = 'No member found with this username.',
	BLOCKED_USER = 'This account has been blocked.',
	WRONG_PASSWORD = 'Incorrect password. Please try again.',
	NOT_AUTHENTICATED = 'Please log in to access this feature.',
	NOT_AUTHORIZED = 'You do not have permission to perform this action.',
	TOKEN_NOT_EXIST = 'Authentication token is missing.',
	PROVIDE_ALLOWED_FORMAT = 'Please upload an image in JPG, JPEG, or PNG format.',
	SELF_SUBSRIPTION_DENIED = 'You cannot subscribe to yourself.',
	INSUFFICIENT_POINTS = 'You do not have enough points for this action.',
	ALREADY_SUBSCRIBED = 'You are already subscribed to this member.',
	ADMIN_COUNT_MAX = 'The maximum number of admins has been reached.',
	NOT_SUBSCRIBED = 'You are not subscribed to this member.',

	// ===== Event Related Messages =====
	EVENT_NOT_FOUND = 'Event not found.',
	EVENT_ALREADY_EXISTS = 'An event with this title already exists.',
	EVENT_GROUP_REQUIRED = 'Please select a group for this event.',
	EVENT_NOT_DELETED = 'Failed to delete the event.',
	EVENT_CANCELLED = 'This event has been cancelled.',
	EVENT_COMPLETED = 'This event has been completed.',
	EVENT_FULL = 'This event has reached its capacity.',
	UNABLE_TO_CANCEL_EVENT = 'Unable to cancel this event.',

	// ===== Group Related Messages =====
	GROUP_NOT_FOUND = 'Group not found.',
	GROUP_ALREADY_EXISTS = 'A group with this name already exists.',
	NOT_GROUP_ADMIN = 'Only group administrators can perform this action.',
	ALREADY_JOINED = 'You are already a member of this group.',
	NOT_JOINED = 'You are not a member of this group.',
	OWNER_CANNOT_LEAVE = 'Group owner cannot leave the group.',
	LEAVE_FAILED = 'Failed to leave the group.',

	// ===== Ticket Related Messages =====
	TICKET_CREATION_FAILED = 'Failed to create the ticket.',
	TICKET_ALREADY_PURCHASED = 'You have already purchased a ticket for this event.',
	TICKET_NOT_FOUND = 'Ticket not found.',
	TICKET_ALREADY_CANCELLED = 'This ticket has already been cancelled.',
	TICKET_QUANTITY_INVALID = 'Ticket quantity must be greater than 0.',
}

// ===== Currency =====
export enum Currency {
	KRW = 'KRW',
	USD = 'USD',
	JPY = 'JPY',
	EUR = 'EUR',
}

// ===== Direction =====
export enum Direction {
	ASC = 1,
	DESC = -1,
}

// Register Currency enum
registerEnumType(Currency, { name: 'Currency' });

// Register Direction enum
registerEnumType(Direction, { name: 'Direction' });
