import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// ===== Schemas =====
import EventSchema from '../../schemas/Event.schema';
import MemberSchema from '../../schemas/Member.schema';
import GroupSchema from '../../schemas/Group.schema';
import TicketSchema from '../../schemas/Ticket.schema';
import GroupMemberSchema from '../../schemas/GroupMember.schema';

// ===== Components =====
import { AuthModule } from '../auth/auth.module';
import { NotificationModule } from '../notification/notification.module';
import { MemberModule } from '../member/member.module';
import { TicketModule } from '../ticket/ticket.module';
import { LikeModule } from '../like/like.module';
import { ViewModule } from '../view/view.module';

// ===== Event Components =====
import { EventResolver } from './event.resolver';
import { EventService } from './event.service';

@Module({
	imports: [
		MongooseModule.forFeature([{ name: 'Event', schema: EventSchema }]),
		MongooseModule.forFeature([{ name: 'Member', schema: MemberSchema }]),
		MongooseModule.forFeature([{ name: 'Group', schema: GroupSchema }]),
		MongooseModule.forFeature([{ name: 'Ticket', schema: TicketSchema }]),
		MongooseModule.forFeature([{ name: 'GroupMember', schema: GroupMemberSchema }]),
		MemberModule,
		TicketModule,
		LikeModule,
		ViewModule,
		AuthModule,
		NotificationModule,
	],
	providers: [EventResolver, EventService],
	exports: [EventService],
})
export class EventModule {}
