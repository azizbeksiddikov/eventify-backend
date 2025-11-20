import { Module } from '@nestjs/common';
import { BatchController } from './batch.controller';
import { BatchService } from './batch.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { ScheduleModule } from '@nestjs/schedule';
import { MongooseModule } from '@nestjs/mongoose';
import MemberSchema from '@app/eventify-api/src/schemas/Member.schema';
import { AgendaModule } from './agenda/agenda.module';

@Module({
	imports: [
		ConfigModule.forRoot(),
		DatabaseModule,
		ScheduleModule.forRoot(),
		MongooseModule.forFeature([{ name: 'Member', schema: MemberSchema }]),
		AgendaModule,
	],
	controllers: [BatchController],
	providers: [BatchService],
})
export class BatchModule {}
