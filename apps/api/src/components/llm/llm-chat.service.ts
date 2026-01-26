import { Injectable } from '@nestjs/common';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { LLMChatRequest, LLMConnectionResponse, LLMChatResponse } from '../../libs/dto/llm/llm';
import { logger } from '../../libs/logger';

@Injectable()
export class LLMChatService {
	private readonly genAI: GoogleGenerativeAI;
	private readonly model: GenerativeModel;
	private readonly modelName: string;
	private readonly context = 'LLMChatService';

	constructor() {
		const apiKey = process.env.GEMINI_API_KEY;
		if (!apiKey) throw new Error('GEMINI_API_KEY must be set');

		this.modelName = 'gemini-2.5-flash';
		this.genAI = new GoogleGenerativeAI(apiKey);
		this.model = this.genAI.getGenerativeModel({
			model: this.modelName,
			generationConfig: {
				temperature: 0.5,
			},
		});

		logger.info(this.context, 'LLMChatService initialized with Gemini API key');
	}

	async checkConnection(): Promise<LLMConnectionResponse> {
		try {
			// Test the connection by making a simple request
			const result = await this.model.generateContent('Hello');
			const response = result.response;
			response.text(); // This will throw if there's an API error

			return {
				success: true,
				message: 'Connected to Gemini AI - model ready',
				baseUrl: 'Gemini API',
				configuredModel: this.modelName,
				modelReady: true,
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			logger.error(this.context, 'Gemini connection error', error instanceof Error ? error : new Error(errorMessage));
			return {
				success: false,
				message: 'Failed to connect to Gemini AI',
				error: errorMessage,
				baseUrl: 'Gemini API',
				configuredModel: this.modelName,
			};
		}
	}

	async directChat(request?: LLMChatRequest): Promise<LLMChatResponse> {
		const prompt = request?.prompt || 'Say "Hello, I am working!" in a friendly way.';
		const temperature = request?.temperature ?? 0.7;

		const startTime = Date.now();

		try {
			const customModel = this.genAI.getGenerativeModel({
				model: this.modelName,
				generationConfig: {
					temperature: temperature,
				},
			});

			const result = await customModel.generateContent(prompt);
			const response = result.response;
			const aiResponse = response.text();

			const endTime = Date.now();
			const duration = endTime - startTime;

			// Use actual Gemini metrics from usageMetadata
			const usageMetadata = response.usageMetadata;
			const promptTokenCount = usageMetadata?.promptTokenCount || 0;
			const candidatesTokenCount = usageMetadata?.candidatesTokenCount || 0;
			const totalTokenCount = usageMetadata?.totalTokenCount || 0;
			const cachedContentTokenCount = usageMetadata?.cachedContentTokenCount;

			// Gemini 2.5 Flash context window
			const contextWindowSize = 32768;

			return {
				success: true,
				request: {
					prompt: prompt,
					promptLength: prompt.length,
					model: this.modelName,
					temperature: temperature,
					num_ctx: contextWindowSize,
				},
				tokenInfo: {
					promptTokenCount: promptTokenCount,
					candidatesTokenCount: candidatesTokenCount,
					totalTokenCount: totalTokenCount,
					cachedContentTokenCount: cachedContentTokenCount,
					contextWindowSize: contextWindowSize,
					tokensUsed: `${totalTokenCount} / ${contextWindowSize} (${((totalTokenCount / contextWindowSize) * 100).toFixed(2)}%)`,
					outputTokensUsed: `${candidatesTokenCount}`,
				},
				performance: {
					totalDurationMs: duration,
					tokensPerSecond: candidatesTokenCount > 0 ? (candidatesTokenCount / (duration / 1000)).toFixed(2) : '0',
				},
				response: {
					text: aiResponse,
					length: aiResponse.length,
					preview: aiResponse.substring(0, 200) + (aiResponse.length > 200 ? '...' : ''),
				},
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			return {
				success: false,
				error: errorMessage,
				request: {
					prompt: prompt,
					promptLength: prompt.length,
					model: this.modelName,
					temperature: temperature,
					num_ctx: 32768,
				},
				hint: 'Make sure GEMINI_API_KEY is set correctly',
			};
		}
	}
}
