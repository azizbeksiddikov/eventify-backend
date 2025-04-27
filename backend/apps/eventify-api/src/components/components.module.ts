import { Module } from '@nestjs/common';
import { MemberModule } from './member/member.module';
import { AuthModule } from './auth/auth.module';
import { GroupModule } from './group/group.module';

@Module({
	imports: [MemberModule, AuthModule, GroupModule],
})
export class ComponentsModule {}
