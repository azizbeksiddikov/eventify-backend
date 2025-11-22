import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LikeService } from './like.service';
import LikeSchema from '../../schemas/Like.schema';

import { NotificationModule } from '../notification/notification.module';

@Module({
	imports: [
		MongooseModule.forFeature([{ name: 'Like', schema: LikeSchema }]), //
		NotificationModule,
	],
	providers: [LikeService],
	exports: [LikeService],
})
export class LikeModule {}
