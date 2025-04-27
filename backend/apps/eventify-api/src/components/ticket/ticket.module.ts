import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import MemberSchema from '../../schemas/Member.schema';
import FollowSchema from '../../schemas/Follow.schema';
import { AuthModule } from '../auth/auth.module';
import EventSchema from '../../schemas/Event.schema';
import TicketSchema from '../../schemas/Ticket.schema';
import { TicketService } from './ticket.service';

@Module({
	imports: [
		MongooseModule.forFeature([{ name: 'Ticket', schema: TicketSchema }]),
		MongooseModule.forFeature([{ name: 'Member', schema: MemberSchema }]),
		MongooseModule.forFeature([{ name: 'Event', schema: EventSchema }]),
		AuthModule,
	],
	providers: [TicketService],
	exports: [TicketService],
})
export class TicketModule {
	constructor() {}
}
