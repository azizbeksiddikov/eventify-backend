import { Module } from '@nestjs/common';
import { MemberModule } from './member/member.module';
import { AuthModule } from './auth/auth.module';
import { GroupModule } from './group/group.module';
import { EventModule } from './event/event.module';
import { TicketModule } from './ticket/ticket.module';
import { ViewModule } from './view/view.module';
import { LikeModule } from './like/like.module';
import { FollowModule } from './follow/follow.module';
import { CommentModule } from './comment/comment.module';
import { FaqModule } from './faq/faq.module';
import { NotificationModule } from './notification/notification.module';

@Module({
	imports: [
		AuthModule,
		CommentModule,
		EventModule,
		FollowModule,
		GroupModule,
		LikeModule,
		MemberModule,
		TicketModule,
		ViewModule,
		FaqModule,
		NotificationModule,
	],
})
export class ComponentsModule {}
