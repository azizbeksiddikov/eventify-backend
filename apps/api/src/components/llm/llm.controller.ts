import { Controller, Post, Body, Get } from '@nestjs/common';
import { LLMChatService } from './llm-chat.service';
import type { LLMChatRequest } from '../../libs/dto/llm/llm';

@Controller('llm')
export class LLMController {
	constructor(private readonly llmChatService: LLMChatService) {}

	@Get('connection')
	async checkConnection() {
		return this.llmChatService.checkConnection();
	}

	@Post('chat')
	async directChat(@Body() request: LLMChatRequest) {
		try {
			// Gemini is cloud-based, no container management needed
			const result = await this.llmChatService.directChat(request);
			return result;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			return {
				success: false,
				error: `Chat failed: ${errorMessage}`,
				hint: 'Ensure GEMINI_API_KEY is set correctly',
			};
		}
	}
}
