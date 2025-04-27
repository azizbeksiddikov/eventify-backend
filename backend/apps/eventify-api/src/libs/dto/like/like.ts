import { Field, ObjectType } from '@nestjs/graphql';
import { LikeGroup } from '../../enums/like.enum';

@ObjectType()
export class Like {
	@Field(() => String)
	_id: string;

	@Field(() => String)
	memberId: string;

	@Field(() => LikeGroup)
	likeGroup: LikeGroup;

	@Field(() => String)
	likeRefId: string;

	@Field(() => Date)
	createdAt: Date;
}
