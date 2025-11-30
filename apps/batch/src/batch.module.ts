import { Module } from '@nestjs/common';
import { BatchController } from './batch.controller';
import { BatchService } from './batch.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { ScheduleModule } from '@nestjs/schedule';
import { AgendaModule } from './agenda/agenda.module';
import { ComponentsModule } from './components/components.module';

@Module({
	imports: [ConfigModule.forRoot(), DatabaseModule, ScheduleModule.forRoot(), AgendaModule, ComponentsModule],
	controllers: [BatchController],
	providers: [BatchService],
})
export class BatchModule {}
