import { Injectable } from '@nestjs/common';
import {
	OllamaResponse,
	OllamaError,
	OllamaTagsResponse,
	LLMChatRequest,
	LLMConnectionResponse,
	LLMChatResponse,
} from '../../libs/dto/llm/llm';

@Injectable()
export class LLMChatService {
	private readonly ollamaModel: string;
	private readonly ollamaBaseUrl: string;

	constructor() {
		const ollamaModel = process.env.OLLAMA_MODEL;
		const ollamaBaseUrl = process.env.OLLAMA_BASE_URL;
		if (!ollamaModel || !ollamaBaseUrl) throw new Error('OLLAMA_MODEL and OLLAMA_BASE_URL must be set');

		this.ollamaModel = ollamaModel;
		this.ollamaBaseUrl = ollamaBaseUrl;
	}

	private async ensureOllamaRunning(): Promise<void> {
		try {
			const response = await fetch(`${this.ollamaBaseUrl}/api/version`, {
				signal: AbortSignal.timeout(3000),
			});
			if (response.ok) {
				return; // Ollama is running
			}
		} catch {
			// Ollama is not accessible - log warning but don't fail
			console.warn(
				`Ollama is not accessible at ${this.ollamaBaseUrl}. Ensure the Ollama container is running with: docker-compose --profile llm up -d ollama`,
			);
		}
	}

	async checkConnection(): Promise<LLMConnectionResponse> {
		// Try to start container if needed
		await this.ensureOllamaRunning();

		try {
			const response = await fetch(`${this.ollamaBaseUrl}/api/tags`, {
				method: 'GET',
			});
			if (!response.ok) {
				throw new Error(`Ollama API error: ${response.statusText}`);
			}

			const data = (await response.json()) as OllamaTagsResponse;

			const models = data.models || [];
			const hasModels = models.length > 0;
			const hasConfiguredModel = models.some((m) => m.name === this.ollamaModel);

			return {
				success: true,
				message: hasModels
					? hasConfiguredModel
						? 'Connected to Ollama - model ready'
						: `Connected to Ollama - model "${this.ollamaModel}" not found in available models`
					: 'Connected to Ollama - no models installed',
				baseUrl: this.ollamaBaseUrl,
				configuredModel: this.ollamaModel,
				availableModels: data,
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error('Ollama connection error:', errorMessage);
			return {
				success: false,
				message: 'Failed to connect to Ollama',
				error: errorMessage,
				baseUrl: this.ollamaBaseUrl,
				configuredModel: this.ollamaModel,
			};
		}
	}

	async directChat(request?: LLMChatRequest): Promise<LLMChatResponse> {
		// Try to start container if needed
		await this.ensureOllamaRunning();

		const prompt = request?.prompt || 'Say "Hello, I am working!" in a friendly way.';
		const model = request?.model || this.ollamaModel;
		const temperature = request?.temperature ?? 0.7;
		const num_predict = request?.num_predict ?? 100;
		const num_ctx = request?.num_ctx ?? 2048;

		// Estimate token count (rough approximation: 1 token ≈ 4 characters)
		const promptTokens = Math.ceil(prompt.length / 4);
		const maxTokens = num_predict;
		const contextTokens = num_ctx;

		const startTime = Date.now();

		try {
			const response = await fetch(`${this.ollamaBaseUrl}/api/generate`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					model: model,
					prompt: prompt,
					stream: false,
					options: {
						temperature: temperature,
						num_predict: num_predict,
						num_ctx: num_ctx,
						num_thread: 1,
					},
				}),
			});

			const endTime = Date.now();
			const duration = endTime - startTime;

			if (!response.ok) {
				const errorData = (await response.json()) as OllamaError;
				throw new Error(`Ollama API error: ${errorData.error || response.statusText}`);
			}

			const data = (await response.json()) as OllamaResponse;
			const aiResponse = data.response || '';

			// Estimate output tokens
			const outputTokens = Math.ceil(aiResponse.length / 4);

			return {
				success: true,
				request: {
					prompt: prompt,
					promptLength: prompt.length,
					model: model,
					temperature: temperature,
					num_predict: num_predict,
					num_ctx: num_ctx,
				},
				tokenInfo: {
					estimatedPromptTokens: promptTokens,
					estimatedOutputTokens: outputTokens,
					estimatedTotalTokens: promptTokens + outputTokens,
					maxPredictTokens: maxTokens,
					contextWindowSize: contextTokens,
					tokensUsed: `${promptTokens + outputTokens} / ${contextTokens} (${(((promptTokens + outputTokens) / contextTokens) * 100).toFixed(2)}%)`,
					outputTokensUsed: `${outputTokens} / ${maxTokens} (${((outputTokens / maxTokens) * 100).toFixed(2)}%)`,
				},
				performance: {
					totalDurationMs: duration,
					promptEvalCount: data.prompt_eval_count,
					promptEvalDuration: data.prompt_eval_duration,
					evalCount: data.eval_count,
					evalDuration: data.eval_duration,
					tokensPerSecond:
						data.eval_count && data.eval_duration
							? (data.eval_count / (data.eval_duration / 1000000000)).toFixed(2)
							: 'N/A',
				},
				response: {
					text: aiResponse,
					length: aiResponse.length,
					preview: aiResponse.substring(0, 200) + (aiResponse.length > 200 ? '...' : ''),
				},
				raw: data,
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			return {
				success: false,
				error: errorMessage,
				request: {
					prompt: prompt,
					promptLength: prompt.length,
					model: model,
					temperature: temperature,
					num_predict: num_predict,
					num_ctx: num_ctx,
				},
				hint: 'Make sure Ollama Docker container is running and the model is downloaded',
			};
		}
	}
}
