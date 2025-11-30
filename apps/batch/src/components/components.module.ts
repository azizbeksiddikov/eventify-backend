import { Module } from '@nestjs/common';
import { MemberModule } from './member/member.module';
import { EventRecurrenceModule } from './eventRecurrence/eventRecurrence.module';

@Module({
	imports: [MemberModule, EventRecurrenceModule],
})
export class ComponentsModule {}
