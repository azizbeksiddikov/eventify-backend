import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Group {
	@Field(() => String)
	_id: string;

	@Field(() => String)
	groupName: string;

	@Field(() => String)
	groupDesc: string;

	@Field(() => String)
	groupImage: string;

	@Field(() => Number)
	groupViews: number;

	@Field(() => Number)
	groupLikes: number;

	@Field(() => [String])
	groupCategories: string[];

	@Field(() => Date)
	createdAt: Date;

	@Field(() => Date)
	updatedAt: Date;
}
