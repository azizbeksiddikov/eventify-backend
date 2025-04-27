import { Field, ObjectType } from '@nestjs/graphql';
import { ReviewGroup } from '../../enums/review.enum';

@ObjectType()
export class Review {
	@Field(() => String)
	_id: string;

	@Field(() => String)
	memberId: string;

	@Field(() => ReviewGroup)
	reviewGroup: ReviewGroup;

	@Field(() => String)
	reviewRefId: string;

	@Field(() => Number)
	rating: number;

	@Field(() => String, { nullable: true })
	comment?: string;

	@Field(() => Date)
	createdAt: Date;

	@Field(() => Date)
	updatedAt: Date;
}
