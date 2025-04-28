import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// ===== Schemas =====
import GroupSchema from '../../schemas/Group.schema';
import GroupMemberSchema from '../../schemas/GroupMember.schema';
import MemberSchema from '../../schemas/Member.schema';

// ===== Components =====
import { AuthModule } from '../auth/auth.module';

// ===== Group Components =====
import { GroupResolver } from './group.resolver';
import { GroupService } from './group.service';

@Module({
	imports: [
		MongooseModule.forFeature([{ name: 'Group', schema: GroupSchema }]),
		MongooseModule.forFeature([{ name: 'GroupMember', schema: GroupMemberSchema }]),
		MongooseModule.forFeature([{ name: 'Member', schema: MemberSchema }]),
		AuthModule,
	],
	providers: [GroupResolver, GroupService],
	exports: [GroupService],
})
export class GroupModule {}
