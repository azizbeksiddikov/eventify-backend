// ============== LLM Request/Response Types ==============

/**
 * Request body for direct LLM chat
 */
export interface LLMChatRequest {
	prompt?: string;
	model?: string;
	temperature?: number;
	num_ctx?: number;
}

/**
 * Response from Gemini API
 */
export interface GeminiChatResponse {
	text: string;
	[key: string]: unknown;
}

/**
 * Connection status response
 */
export interface LLMConnectionResponse {
	success: boolean;
	message: string;
	baseUrl: string;
	configuredModel: string;
	error?: string;
	hint?: string;
	modelReady?: boolean;
}

/**
 * Token information in LLM chat response
 */
export interface LLMTokenInfo {
	promptTokenCount: number; // Actual prompt tokens from Gemini
	candidatesTokenCount: number; // Actual output tokens from Gemini
	totalTokenCount: number; // Actual total tokens from Gemini
	cachedContentTokenCount?: number; // Cached tokens if available
	contextWindowSize: number;
	tokensUsed: string; // Formatted usage string
	outputTokensUsed: string; // Formatted output usage string
}

/**
 * Performance metrics in LLM chat response
 */
export interface LLMPerformance {
	totalDurationMs: number;
	promptEvalCount?: number;
	promptEvalDuration?: number;
	evalCount?: number;
	evalDuration?: number;
	tokensPerSecond: string | number;
}

/**
 * LLM direct chat response
 */
export interface LLMChatResponse {
	success: boolean;
	request: {
		prompt: string;
		promptLength: number;
		model: string;
		temperature: number;
		num_ctx: number;
	};
	tokenInfo?: LLMTokenInfo;
	performance?: LLMPerformance;
	response?: {
		text: string;
		length: number;
		preview: string;
	};
	raw?: {
		done: boolean;
		context?: number[];
		totalDuration?: number;
		loadDuration?: number;
	};
	error?: string;
	hint?: string;
}
