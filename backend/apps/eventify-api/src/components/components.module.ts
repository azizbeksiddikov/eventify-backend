import { Module } from '@nestjs/common';
import { MemberModule } from './member/member.module';
import { AuthModule } from './auth/auth.module';
import { GroupModule } from './group/group.module';
import { EventModule } from './event/event.module';
import { TicketModule } from './ticket/ticket.module';
import { FollowModule } from './follow/follow.module';

@Module({
	imports: [MemberModule, AuthModule, GroupModule, EventModule, TicketModule, FollowModule],
})
export class ComponentsModule {}
