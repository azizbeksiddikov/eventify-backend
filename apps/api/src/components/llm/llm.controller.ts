import { Controller, Post, Body, Get } from '@nestjs/common';
import { LLMChatService } from './llm-chat.service';
import { OllamaService } from './ollama.service';
import type { LLMChatRequest } from '../../libs/dto/llm/llm';

@Controller('llm')
export class LLMController {
	constructor(
		private readonly llmChatService: LLMChatService,
		private readonly ollamaService: OllamaService,
	) {}

	@Get('connection')
	async checkConnection() {
		return this.llmChatService.checkConnection();
	}

	@Post('chat')
	async directChat(@Body() request: LLMChatRequest) {
		try {
			// Start Ollama if not running
			await this.ollamaService.startOllama();
			this.ollamaService.markProcessingStart();

			// Execute chat
			const result = await this.llmChatService.directChat(request);

			return result;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			return {
				success: false,
				error: `Chat failed: ${errorMessage}`,
				hint: 'Ensure Docker is running and you have sufficient resources',
			};
		} finally {
			this.ollamaService.markProcessingEnd();
		}
	}
}
