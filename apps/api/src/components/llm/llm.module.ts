import { Module } from '@nestjs/common';
import { LLMController } from './llm.controller';
import { LLMChatService } from './llm-chat.service';
import { OllamaService } from './ollama.service';

@Module({
	controllers: [LLMController],
	providers: [LLMChatService, OllamaService],
	exports: [LLMChatService, OllamaService],
})
export class LLMModule {}
