import { Module } from '@nestjs/common';
import { MemberModule } from './member/member.module';
import { EventRecurrenceModule } from './eventRecurrence/eventRecurrence.module';
import { WebCrawlingModule } from './webCrawling/webCrawling.module';
import { EventStatusCleanupModule } from './eventStatusCleanup/eventStatusCleanup.module';

@Module({
	imports: [MemberModule, EventRecurrenceModule, WebCrawlingModule, EventStatusCleanupModule],
	exports: [MemberModule, EventRecurrenceModule, WebCrawlingModule, EventStatusCleanupModule],
})
export class ComponentsModule {}
