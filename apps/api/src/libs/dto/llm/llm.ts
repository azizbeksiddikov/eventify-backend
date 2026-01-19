// ============== LLM Request/Response Types ==============

/**
 * Request body for direct LLM chat
 */
export interface LLMChatRequest {
	prompt?: string;
	model?: string;
	temperature?: number;
	num_predict?: number;
	num_ctx?: number;
}

/**
 * Response from Ollama API generate endpoint
 */
export interface OllamaResponse {
	response: string;
	done: boolean;
	context?: number[];
	total_duration?: number;
	load_duration?: number;
	prompt_eval_count?: number;
	prompt_eval_duration?: number;
	eval_count?: number;
	eval_duration?: number;
}

/**
 * Error response from Ollama API
 */
export interface OllamaError {
	error: string;
}

/**
 * Response from Ollama API tags endpoint
 */
export interface OllamaTagsResponse {
	models?: Array<{
		name: string;
		model?: string;
		size?: number;
		digest?: string;
		modified_at?: string;
		[key: string]: unknown;
	}>;
}

/**
 * Connection status response
 */
export interface LLMConnectionResponse {
	success: boolean;
	message: string;
	baseUrl: string;
	configuredModel: string;
	availableModels?: OllamaTagsResponse;
	error?: string;
	hint?: string;
	modelReady?: boolean;
	other?: string;
}

/**
 * Token information in LLM chat response
 */
export interface LLMTokenInfo {
	estimatedPromptTokens: number;
	estimatedOutputTokens: number;
	estimatedTotalTokens: number;
	maxPredictTokens: number;
	contextWindowSize: number;
	tokensUsed: string;
	outputTokensUsed: string;
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
		num_predict: number;
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
