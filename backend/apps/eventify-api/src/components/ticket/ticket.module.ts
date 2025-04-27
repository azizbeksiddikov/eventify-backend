import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import MemberSchema from '../../schemas/Member.schema';
import FollowSchema from '../../schemas/Follow.schema';
import { AuthModule } from '../auth/auth.module';
import TicketSchema from '../../schemas/Ticket.schema';
import { TicketService } from './ticket.service';

@Module({
	imports: [MongooseModule.forFeature([{ name: 'Ticket', schema: TicketSchema }]), AuthModule],
	providers: [TicketService],
	exports: [TicketService],
})
export class TicketModule {
	constructor() {}
}
