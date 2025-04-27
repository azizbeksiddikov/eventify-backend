import { Field, ObjectType } from '@nestjs/graphql';
import { EventStatus } from '../../enums/event.enum';

@ObjectType()
export class Event {
	@Field(() => String)
	_id: string;

	@Field(() => String)
	eventName: string;

	@Field(() => String)
	eventDesc: string;

	@Field(() => Date)
	eventDate: Date;

	@Field(() => String)
	eventStartTime: string;

	@Field(() => String)
	eventEndTime: string;

	@Field(() => String)
	eventAddress: string;

	@Field(() => String)
	eventOrganizerId: string;

	@Field(() => Number)
	eventCapacity: number;

	@Field(() => Number)
	attendeeCount: number;

	@Field(() => String)
	eventImage: string;

	@Field(() => EventStatus)
	eventStatus: EventStatus;

	@Field(() => String)
	groupId: string;

	@Field(() => [String])
	eventCategories: string[];

	@Field(() => Number)
	eventLikes: number;

	@Field(() => Number)
	eventViews: number;

	@Field(() => Date)
	createdAt: Date;

	@Field(() => Date)
	updatedAt: Date;
}
