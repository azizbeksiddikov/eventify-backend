import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import MemberSchema from '@app/api/src/schemas/Member.schema';
import { MemberService } from './member.service';

@Module({
	imports: [MongooseModule.forFeature([{ name: 'Member', schema: MemberSchema }])],
	providers: [MemberService],
	exports: [MemberService],
})
export class MemberModule {}
