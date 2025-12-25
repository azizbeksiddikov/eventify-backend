import { Module } from '@nestjs/common';
import { MemberModule } from './member/member.module';
import { EventRecurrenceModule } from './eventRecurrence/eventRecurrence.module';
import { WebCrawlingModule } from './webCrawling/webCrawling.module';

@Module({
	imports: [MemberModule, EventRecurrenceModule, WebCrawlingModule],
	exports: [MemberModule, EventRecurrenceModule, WebCrawlingModule],
})
export class ComponentsModule {}
