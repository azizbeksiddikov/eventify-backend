import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Follow {
	@Field(() => String)
	_id: string;

	@Field(() => String)
	followingId: string;

	@Field(() => String)
	followerId: string;

	@Field(() => Date)
	createdAt: Date;
}
