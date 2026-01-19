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
import { UploadModule } from './upload/upload.module';
import { CurrencyModule } from './currency/currency.module';
import { LLMModule } from './llm/llm.module';

// Only include LLM direct chat module in development
const isDevelopment = process.env.NODE_ENV !== 'production';
const devModules = isDevelopment ? [LLMModule] : [];

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
		UploadModule,
		ViewModule,
		CurrencyModule,
		...devModules,
	],
})
export class ComponentsModule {}
