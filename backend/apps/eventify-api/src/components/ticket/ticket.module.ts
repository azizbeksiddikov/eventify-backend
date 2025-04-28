import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// ===== Schemas =====
import MemberSchema from '../../schemas/Member.schema';
import EventSchema from '../../schemas/Event.model';
import TicketSchema from '../../schemas/Ticket.schema';

// ===== Components =====
import { AuthModule } from '../auth/auth.module';

// ===== Ticket Components =====
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
export class TicketModule {}
