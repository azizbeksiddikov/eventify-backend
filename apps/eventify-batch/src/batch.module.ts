import { Module } from '@nestjs/common';
import { BatchController } from './batch.controller';
import { BatchService } from './batch.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { ScheduleModule } from '@nestjs/schedule';
import { MongooseModule } from '@nestjs/mongoose';
import MemberSchema from '@app/eventify-api/src/schemas/Member.schema';
import EventRecurrenceSchema from '@app/eventify-api/src/schemas/EventRecurrence.schema';
import EventSchema from '@app/eventify-api/src/schemas/Event.schema';
import { AgendaModule } from './agenda/agenda.module';
import { EventRecurrenceBatchService } from './lib/eventRecurrenceBatch.service';

@Module({
	imports: [
		ConfigModule.forRoot(),
		DatabaseModule,
		ScheduleModule.forRoot(),
		MongooseModule.forFeature([
			{ name: 'Member', schema: MemberSchema },
			{ name: 'EventRecurrence', schema: EventRecurrenceSchema },
			{ name: 'Event', schema: EventSchema },
		]),
		AgendaModule,
	],
	controllers: [BatchController],
	providers: [BatchService, EventRecurrenceBatchService],
})
export class BatchModule {}
