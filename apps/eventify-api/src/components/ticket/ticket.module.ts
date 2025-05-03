import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// ===== Schemas =====
import MemberSchema from '../../schemas/Member.schema';
import EventSchema from '../../schemas/Event.schema';
import TicketSchema from '../../schemas/Ticket.schema';

// ===== Components =====
import { AuthModule } from '../auth/auth.module';

// ===== Ticket Components =====
import { TicketService } from './ticket.service';
import { TicketResolver } from './ticket.resolver';
@Module({
	imports: [
		MongooseModule.forFeature([{ name: 'Ticket', schema: TicketSchema }]),
		MongooseModule.forFeature([{ name: 'Member', schema: MemberSchema }]),
		MongooseModule.forFeature([{ name: 'Event', schema: EventSchema }]),
		AuthModule,
	],
	providers: [TicketService, TicketResolver],
	exports: [TicketService],
})
export class TicketModule {}
