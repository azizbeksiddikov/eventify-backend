import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import EventRecurrenceSchema from '@app/api/src/schemas/EventRecurrence.schema';
import EventSchema from '@app/api/src/schemas/Event.schema';
import { EventRecurrenceController } from './eventRecurrence.controller';
import { EventRecurrenceService } from './eventRecurrence.service';
import { AgendaModule } from '../../agenda/agenda.module';

@Module({
	imports: [
		MongooseModule.forFeature([
			{ name: 'EventRecurrence', schema: EventRecurrenceSchema },
			{ name: 'Event', schema: EventSchema },
		]),
		AgendaModule,
	],
	controllers: [EventRecurrenceController],
	providers: [EventRecurrenceService],
	exports: [EventRecurrenceService],
})
export class EventRecurrenceModule {}
