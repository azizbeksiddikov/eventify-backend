import { Message } from './enums/common.enum';

/**
 * Error codes.
 *
 * The code of an error is the KEY of the matching member in the `Message` enum
 * (`Message.EVENT_FULL` has the code `EVENT_FULL`). The enum value is the English
 * text, kept for logs and API users. Clients translate by code, never by text,
 * so the text can be reworded without breaking any translation.
 */
export type ErrorCode = keyof typeof Message;

export type ErrorParams = Record<string, string | number>;

export interface ErrorBody {
	code: ErrorCode;
	message: string;
	params?: ErrorParams;
}

/**
 * Body for a Nest exception: `throw new BadRequestException(errorBody('EVENT_FULL'))`.
 * `{name}` placeholders in the English text are filled from `params`, and `params`
 * is sent to the client so it can fill the same placeholders in its translation.
 */
export function errorBody(code: ErrorCode, params?: ErrorParams): ErrorBody {
	let message: string = Message[code];
	for (const [name, value] of Object.entries(params ?? {})) {
		message = message.split(`{${name}}`).join(String(value));
	}
	return params ? { code, message, params } : { code, message };
}

/** What the API sends for every GraphQL error. */
export interface FormattedGraphQLError {
	message: string;
	/** Kept at the top level for older clients. Same value as `extensions.code`. */
	code?: string;
	extensions: { code?: string; params?: ErrorParams };
}

type ErrorLike = { message: string; extensions?: Record<string, unknown> };

/**
 * Turns a thrown error into the GraphQL error the clients receive.
 * Uses the code and params from `errorBody`; for anything else it keeps Nest's own
 * code (`BAD_REQUEST`, `INTERNAL_SERVER_ERROR`, ...) and, for validation errors,
 * the first validation message.
 */
export function formatGraphQLError(error: ErrorLike): FormattedGraphQLError {
	const extensions = error.extensions ?? {};
	const response = extensions.response as
		| { code?: string; message?: string | string[]; params?: ErrorParams }
		| undefined;

	const message = Array.isArray(response?.message) ? response.message[0] : response?.message || error.message;
	const code = response?.code ?? (extensions.code as string | undefined);
	const params = response?.params;

	return { message, code, extensions: params ? { code, params } : { code } };
}
