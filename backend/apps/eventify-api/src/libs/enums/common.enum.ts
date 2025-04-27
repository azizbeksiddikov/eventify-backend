import { registerEnumType } from '@nestjs/graphql';

export enum Message {
	SOMETHING_WENT_WRONG = 'Something went wrong!',
	NO_DATA_FOUND = 'No data found',
	CREATE_FAILED = 'Create failed',
	UPDATE_FAILED = 'Update failed',
	REMOVE_FAILED = 'Remove failed!',
	UPLOAD_FAILED = 'Upload failed!',
	BAD_REQUEST = 'Bad request!',

	// Member related messages
	USED_MEMBER_NICK_OR_PHONE = 'Username or phone already in use',
	NO_MEMBER_NICK = 'No member with this username',
	BLOCKED_USER = 'User is blocked',
	WRONG_PASSWORD = 'Wrong password',
	NOT_AUTHENTICATED = 'You are not authenticated, please login first!',
	NOT_AUTHORIZED = 'You are not authorized to perform this action!',
	TOKEN_NOT_EXIST = 'Bearer Token is not provided!',
	ONLY_SPECIFIC_ROLES_ALLOWED = 'Allowed only for members with specific roles!',
	NOT_ALLOWED_REQUEST = 'Not allowed request!',
	PROVIDE_ALLOWED_FORMAT = 'Please provide jpg, jpeg or png images!',
	SELF_SUBSRIPTION_DENIED = 'Self subscription is denied!',
	INVALID_EMAIL_FORMAT = 'Invalid email format!',
	INVALID_PHONE_FORMAT = 'Invalid phone number format!',
	PASSWORD_TOO_SHORT = 'Password must be at least 6 characters long!',
	INVALID_USERNAME_FORMAT = 'Username can only contain letters, numbers, and underscores!',
	MEMBER_NOT_FOUND = 'Member not found',

	// Event related messages
	EVENT_NOT_FOUND = 'Event not found!',
	EVENT_ALREADY_EXISTS = 'Event with this title already exists!',
	EVENT_DATE_INVALID = 'Event date must be in the future!',
	EVENT_CAPACITY_INVALID = 'Event capacity must be greater than 0!',
	EVENT_PRICE_INVALID = 'Event price must be greater than or equal to 0!',
	EVENT_IMAGE_REQUIRED = 'Event image is required!',
	EVENT_DESCRIPTION_REQUIRED = 'Event description is required!',
	EVENT_LOCATION_REQUIRED = 'Event location is required!',
	EVENT_CATEGORY_REQUIRED = 'Event category is required!',
	EVENT_GROUP_REQUIRED = 'Event group is required!',
	EVENT_ALREADY_DELETED = 'Event already deleted!',
	EVENT_NOT_DELETED = 'Event not deleted!',

	// Group related messages
	GROUP_NOT_FOUND = 'Group not found',
	GROUP_ALREADY_EXISTS = 'Group already exists',
	GROUP_NAME_REQUIRED = 'Group name is required!',
	GROUP_DESCRIPTION_REQUIRED = 'Group description is required!',
	GROUP_IMAGE_REQUIRED = 'Group image is required!',
	GROUP_PRIVACY_REQUIRED = 'Group privacy setting is required!',
	NOT_GROUP_ADMIN = 'Only group administrators can perform this action!',
	NOT_GROUP_MEMBER = 'You are not a member of this group!',
	GROUP_MEMBER_LIMIT_REACHED = 'Group member limit reached!',
	GROUP_INVITATION_REQUIRED = 'Group invitation is required to join!',
	GROUP_UPDATE_FAILED = 'Group update failed',
	GROUP_DELETE_FAILED = 'Group delete failed',
	GROUP_JOIN_FAILED = 'Failed to join group',
	GROUP_LEAVE_FAILED = 'Failed to leave group',
	GROUP_ROLE_UPDATE_FAILED = 'Failed to update member role',
	GROUP_ALREADY_JOINED = 'You are already a member of this group',
	GROUP_ORGANIZER_CANNOT_JOIN = 'Organizers cannot join groups',
	GROUP_MEMBER_NOT_FOUND = 'Group member not found',
	ALREADY_JOINED = 'Member is already part of this group',
	NOT_JOINED = 'Member is not part of this group',
	OWNER_CANNOT_LEAVE = 'Group owner cannot leave the group',
	DELETE_FAILED = 'Failed to delete the record',
}

export enum Direction {
	ASC = 1,
	DESC = -1,
}
registerEnumType(Direction, { name: 'Direction' });
