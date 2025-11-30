import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import MemberSchema from '@app/api/src/schemas/Member.schema';
import { MemberController } from './member.controller';
import { MemberService } from './member.service';

@Module({
	imports: [MongooseModule.forFeature([{ name: 'Member', schema: MemberSchema }])],
	controllers: [MemberController],
	providers: [MemberService],
	exports: [MemberService],
})
export class MemberModule {}
