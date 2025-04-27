import { Field, ObjectType } from '@nestjs/graphql';
import { ViewGroup } from '../../enums/view.enum';

@ObjectType()
export class View {
	@Field(() => String)
	_id: string;

	@Field(() => String)
	memberId: string;

	@Field(() => ViewGroup)
	viewGroup: ViewGroup;

	@Field(() => String)
	viewRefId: string;

	@Field(() => Date)
	createdAt: Date;
}
