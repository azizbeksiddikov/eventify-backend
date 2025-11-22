import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// ===== Schemas =====
import EventRecurrenceSchema from '../../schemas/EventRecurrence.schema';
import EventSchema from '../../schemas/Event.schema';

// ===== Components =====
import { AgendaModule } from '../agenda/agenda.module';
import { AuthModule } from '../auth/auth.module';
import { MemberModule } from '../member/member.module';
import { GroupModule } from '../group/group.module';

// ===== EventRecurrence Components =====
import { EventRecurrenceResolver } from './eventRecurrence.resolver';
import { EventRecurrenceService } from './eventRecurrence.service';

@Module({
	imports: [
		MongooseModule.forFeature([
			{ name: 'EventRecurrence', schema: EventRecurrenceSchema },
			{ name: 'Event', schema: EventSchema },
		]),
		AgendaModule,
		AuthModule,
		MemberModule,
		GroupModule,
	],
	providers: [EventRecurrenceResolver, EventRecurrenceService],
	exports: [EventRecurrenceService],
})
export class EventRecurrenceModule {}
