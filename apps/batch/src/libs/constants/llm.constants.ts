/**
 * LLM Configuration Constants
 */

// Prompt templates
export const LLM_PROMPTS = {
	DESCRIPTION_MAX_LENGTH: 300,
	TAGS_MAX_COUNT: 5,
	CATEGORIZATION_DESC_LENGTH: 250,
	CATEGORIZATION_TAGS_COUNT: 5,
} as const;

// Processing configuration
export const LLM_PROCESSING = {
	BATCH_SIZE: 10, // Events to process concurrently (future optimization)
	TIMEOUT_MS: 30000, // 30 seconds timeout per request
	RETRY_ATTEMPTS: 2,
} as const;
