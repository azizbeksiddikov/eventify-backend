import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// ===== Schemas =====
import CommentSchema from '../../schemas/Comment.model';

// ===== Components =====
import { AuthModule } from '../auth/auth.module';
import { MemberModule } from '../member/member.module';
import { EventModule } from '../event/event.module';
import { GroupModule } from '../group/group.module';

// ===== Comment Components =====
import { CommentService } from './comment.service';
import { CommentResolver } from './comment.resolver';

@Module({
	imports: [
		MongooseModule.forFeature([{ name: 'Comment', schema: CommentSchema }]),
		AuthModule,
		MemberModule,
		EventModule,
		GroupModule,
	],
	providers: [CommentService, CommentResolver],
	exports: [CommentService],
})
export class CommentModule {}
