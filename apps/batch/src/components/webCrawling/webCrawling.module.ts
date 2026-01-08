import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';

import EventSchema from '@app/api/src/schemas/Event.schema';

import { WebCrawlingService } from './webCrawling.service';
import { WebCrawlingController } from './webCrawling.controller';
import { MeetupScraper } from './scrapers/meetup.scraper';
import { LumaScraper } from './scrapers/luma.scraper';
import { LLMModule } from '../llm/llm.module';
import { OllamaModule } from '../ollama/ollama.module';
import { AgendaModule } from '../../agenda/agenda.module';

@Module({
	imports: [
		MongooseModule.forFeature([{ name: 'Event', schema: EventSchema }]),
		HttpModule,
		LLMModule,
		OllamaModule,
		AgendaModule,
	],
	controllers: [WebCrawlingController],
	providers: [WebCrawlingService, MeetupScraper, LumaScraper],
	exports: [WebCrawlingService],
})
export class WebCrawlingModule {}
