import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// ===== Schemas =====
import TicketSchema from '../../schemas/Ticket.schema';

// ===== Components =====
import { AuthModule } from '../auth/auth.module';
import { NotificationModule } from '../notification/notification.module';
import { MemberModule } from '../member/member.module';
import { EventModule } from '../event/event.module';
import { CurrencyModule } from '../currency/currency.module';

// ===== Ticket Components =====
import { TicketService } from './ticket.service';
import { TicketResolver } from './ticket.resolver';

@Module({
	imports: [
		MongooseModule.forFeature([{ name: 'Ticket', schema: TicketSchema }]),
		AuthModule,
		NotificationModule,
		MemberModule,
		EventModule,
		CurrencyModule,
	],
	providers: [TicketService, TicketResolver],
	exports: [TicketService],
})
export class TicketModule {}
