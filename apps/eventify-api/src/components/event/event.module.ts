import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// ===== Schemas =====
import EventSchema from '../../schemas/Event.schema';

// ===== Components =====
import { AuthModule } from '../auth/auth.module';
import { NotificationModule } from '../notification/notification.module';
import { LikeModule } from '../like/like.module';
import { ViewModule } from '../view/view.module';
import { MemberModule } from '../member/member.module';
import { GroupModule } from '../group/group.module';

// ===== Event Components =====
import { EventResolver } from './event.resolver';
import { EventService } from './event.service';

@Module({
	imports: [
		MongooseModule.forFeature([{ name: 'Event', schema: EventSchema }]),
		AuthModule,
		NotificationModule,
		LikeModule,
		ViewModule,
		MemberModule,
		GroupModule,
	],
	providers: [EventResolver, EventService],
	exports: [EventService],
})
export class EventModule {}
