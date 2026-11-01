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
	SELF_SUBSCRIPTION_DENIED = 'You cannot subscribe to yourself.',
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

	// ===== Currency Related Messages =====
	EVENT_CURRENCY_MISSING = 'This paid event has no currency set, so a ticket cannot be priced. Please contact the organizer.',
	CURRENCY_NOT_SUPPORTED = 'This currency is not supported.',
	EVENT_CURRENCY_REQUIRED = 'Choose a currency for a paid event.',
	CURRENCY_NOT_FOUND = 'Currency not found.',
	CURRENCY_ALREADY_EXISTS = 'Currency {currency} already exists.',
	EXCHANGE_RATE_INVALID = 'Exchange rate must be positive.',

	// ===== Event cancel / delete =====
	EVENT_CANNOT_CANCEL = 'Cannot cancel event that is already ongoing or completed.',
	EVENT_CANNOT_DELETE = 'Cannot delete event that is ongoing or completed with attendees.',

	// ===== Recurring events =====
	USE_RECURRING_MUTATION = 'Use createRecurringEvent mutation for recurring events',
	RECURRING_START_IN_PAST = 'Cannot create recurring events starting in the past',
	RECURRING_NOT_SINGLE_DAY = 'Recurring events must be single-day events (duration <= 24 hours)',
	RECURRENCE_NOT_FOUND = 'Event recurrence not found',
	RECURRENCE_INTERVAL_REQUIRED = 'recurrenceInterval is required for INTERVAL type and must be >= 1',
	RECURRENCE_DAYS_OF_WEEK_REQUIRED = 'recurrenceDaysOfWeek is required for DAYS_OF_WEEK type',
	RECURRENCE_DAY_OF_MONTH_REQUIRED = 'recurrenceDayOfMonth is required for DAY_OF_MONTH type and must be between 1 and 31',
	RECURRENCE_END_BEFORE_START = 'recurrenceEndDate must be after eventStartAt',

	// ===== Upload =====
	UPLOAD_TARGET_REQUIRED = 'Target parameter is required',

	// ===== Input =====
	INVALID_OBJECT_ID = 'Invalid ID format.',
}

// ===== Direction =====
export enum Direction {
	ASC = 1,
	DESC = -1,
}

// Register Direction enum
registerEnumType(Direction, { name: 'Direction' });
