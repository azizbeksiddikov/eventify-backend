import { Module } from '@nestjs/common';
import { LLMController } from './llm.controller';
import { LLMChatService } from './llm-chat.service';

@Module({
	controllers: [LLMController],
	providers: [LLMChatService],
	exports: [LLMChatService],
})
export class LLMModule {}
