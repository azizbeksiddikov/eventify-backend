import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// ===== Schemas =====
import GroupSchema from '../../schemas/Group.schema';
import GroupMemberSchema from '../../schemas/GroupMember.schema';

// ===== Components =====
import { AuthModule } from '../auth/auth.module';
import { LikeModule } from '../like/like.module';
import { ViewModule } from '../view/view.module';
import { NotificationModule } from '../notification/notification.module';
import { MemberModule } from '../member/member.module';

// ===== Group Components =====
import { GroupResolver } from './group.resolver';
import { GroupService } from './group.service';

@Module({
	imports: [
		MongooseModule.forFeature([{ name: 'Group', schema: GroupSchema }]),
		MongooseModule.forFeature([{ name: 'GroupMember', schema: GroupMemberSchema }]),
		AuthModule,
		LikeModule,
		ViewModule,
		NotificationModule,
		MemberModule,
	],
	providers: [GroupResolver, GroupService],
	exports: [GroupService],
})
export class GroupModule {}
