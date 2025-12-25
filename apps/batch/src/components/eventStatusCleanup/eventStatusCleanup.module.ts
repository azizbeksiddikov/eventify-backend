import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import EventSchema from '@app/api/src/schemas/Event.schema';

import { EventStatusCleanupService } from './eventStatusCleanup.service';
import { EventStatusCleanupController } from './eventStatusCleanup.controller';
import { AgendaModule } from '../../agenda/agenda.module';

@Module({
	imports: [MongooseModule.forFeature([{ name: 'Event', schema: EventSchema }]), AgendaModule],
	controllers: [EventStatusCleanupController],
	providers: [EventStatusCleanupService],
	exports: [EventStatusCleanupService],
})
export class EventStatusCleanupModule {}
