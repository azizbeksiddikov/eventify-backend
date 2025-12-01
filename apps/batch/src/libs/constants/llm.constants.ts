/**
 * LLM Configuration Constants
 */

// Model configuration
export const LLM_DEFAULTS = {
	MODEL: 'qwen2.5:0.5b',
	BASE_URL: 'http://localhost:11434',
	TEMPERATURE: 0.1, // Lower = more lenient
	MAX_TOKENS_FILTER: 100, // Short responses for filtering
	MAX_TOKENS_CATEGORIZE: 50, // Very short for categorization
} as const;

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
