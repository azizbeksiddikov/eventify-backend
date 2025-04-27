import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import EventSchema from '../../schemas/Event.schema';
import { EventResolver } from './event.resolver';
import { EventService } from './event.service';
import MemberSchema from '../../schemas/Member.schema';
import GroupSchema from '../../schemas/Group.schema';
import { TicketModule } from '../ticket/ticket.module';

@Module({
	imports: [
		MongooseModule.forFeature([{ name: 'Event', schema: EventSchema }]),
		MongooseModule.forFeature([{ name: 'Member', schema: MemberSchema }]),
		MongooseModule.forFeature([{ name: 'Group', schema: GroupSchema }]),
		TicketModule,
		AuthModule,
	],
	providers: [EventResolver, EventService],
	exports: [EventService],
})
export class EventModule {
	constructor() {}
}
