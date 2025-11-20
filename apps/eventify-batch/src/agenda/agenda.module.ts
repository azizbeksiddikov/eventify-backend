import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// ===== Schemas =====
import EventSchema from '@app/eventify-api/src/schemas/Event.schema';

// ===== Agenda Components =====
import { AgendaService } from './agenda.service';

@Module({
	imports: [MongooseModule.forFeature([{ name: 'Event', schema: EventSchema }])],
	providers: [AgendaService],
	exports: [AgendaService],
})
export class AgendaModule {}
