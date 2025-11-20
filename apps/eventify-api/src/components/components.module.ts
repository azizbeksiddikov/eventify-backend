import { Module } from '@nestjs/common';
import { MemberModule } from './member/member.module';
import { AuthModule } from './auth/auth.module';
import { AgendaModule } from './agenda/agenda.module';
import { GroupModule } from './group/group.module';
import { EventModule } from './event/event.module';
import { EventRecurrenceModule } from './eventRecurrence/eventRecurrence.module';
import { TicketModule } from './ticket/ticket.module';
import { ViewModule } from './view/view.module';
import { LikeModule } from './like/like.module';
import { FollowModule } from './follow/follow.module';
import { CommentModule } from './comment/comment.module';
import { FaqModule } from './faq/faq.module';
import { NotificationModule } from './notification/notification.module';

@Module({
	imports: [
		AgendaModule,
		AuthModule,
		CommentModule,
		EventModule,
		EventRecurrenceModule,
		FaqModule,
		FollowModule,
		GroupModule,
		LikeModule,
		MemberModule,
		NotificationModule,
		TicketModule,
		ViewModule,
	],
})
export class ComponentsModule {}
