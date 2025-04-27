import { Field, ObjectType } from '@nestjs/graphql';
import { EventStatus, EventCategory } from '../../enums/event.enum';
import { TotalCounter } from '../member/member';

@ObjectType()
export class Event {
	@Field(() => String)
	_id: string;

	@Field(() => String)
	eventName: string;

	@Field(() => String)
	eventDesc: string;

	@Field(() => String)
	eventImage: string;

	@Field(() => Date)
	eventDate: Date;

	@Field(() => String)
	eventStartTime: string;

	@Field(() => String)
	eventEndTime: string;

	@Field(() => String)
	eventAddress: string;

	@Field(() => Number)
	eventCapacity: number;

	@Field(() => Number)
	eventPrice: number;

	@Field(() => EventStatus)
	eventStatus: EventStatus;

	@Field(() => [String])
	eventCategories: string[];

	@Field(() => Number)
	attendeeCount: number;

	@Field(() => Number)
	eventLikes: number;

	@Field(() => Number)
	eventViews: number;

	@Field(() => String)
	groupId: string;

	@Field(() => String)
	eventOrganizerId: string;

	@Field(() => Date)
	createdAt: Date;

	@Field(() => Date)
	updatedAt: Date;
}

@ObjectType()
export class Events {
	@Field(() => [Event])
	list: Event[];

	@Field(() => [TotalCounter], { nullable: true })
	metaCounter: TotalCounter[];
}
