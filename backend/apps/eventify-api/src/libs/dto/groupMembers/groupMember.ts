import { Field, ObjectType } from '@nestjs/graphql';
import { MemberRole } from '../../enums/group.enum';

@ObjectType()
export class GroupMember {
	@Field(() => String)
	_id: string;

	@Field(() => String)
	groupId: string;

	@Field(() => String)
	memberId: string;

	@Field(() => MemberRole)
	memberRole: MemberRole;

	@Field(() => Date)
	joinDate: Date;

	@Field(() => Date)
	createdAt: Date;

	@Field(() => Date)
	updatedAt: Date;
}
