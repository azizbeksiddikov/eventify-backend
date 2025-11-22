import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// ===== Schemas =====
import FollowSchema from '../../schemas/Follow.schema';

// ===== Components =====
import { AuthModule } from '../auth/auth.module';
import { MemberModule } from '../member/member.module';
import { NotificationModule } from '../notification/notification.module';

// ===== Follow Components =====
import { FollowService } from './follow.service';
import { FollowResolver } from './follow.resolver';

@Module({
	imports: [
		MongooseModule.forFeature([{ name: 'Follow', schema: FollowSchema }]),
		AuthModule,
		MemberModule,
		NotificationModule,
	],
	providers: [FollowService, FollowResolver],
	exports: [FollowService],
})
export class FollowModule {}
