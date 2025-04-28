import { Field, Int, ObjectType } from '@nestjs/graphql';
import { EventStatus, EventCategory } from '../../enums/event.enum';
import { Member, TotalCounter } from '../member/member';
import { ObjectId } from 'mongoose';
import { MeLiked } from '../like/like';

@ObjectType()
export class Event {
	@Field(() => String)
	_id: ObjectId;

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

	@Field(() => Int)
	eventCapacity: number;

	@Field(() => Number)
	eventPrice: number;

	@Field(() => EventStatus)
	eventStatus: EventStatus;

	@Field(() => [EventCategory])
	eventCategories: EventCategory[];

	@Field(() => Int)
	attendeeCount: number;

	@Field(() => Int)
	eventLikes: number;

	@Field(() => Int)
	eventViews: number;

	@Field(() => String)
	groupId: ObjectId;

	@Field(() => String)
	eventOrganizerId: ObjectId;

	@Field(() => Date)
	createdAt: Date;

	@Field(() => Date)
	updatedAt: Date;

	// From Aggregations
	@Field(() => Member, { nullable: true })
	memberData?: Member;

	@Field(() => [MeLiked], { nullable: true })
	meLiked?: MeLiked[];
}

@ObjectType()
export class Events {
	@Field(() => [Event])
	list: Event[];

	@Field(() => [TotalCounter], { nullable: true })
	metaCounter: TotalCounter[];
}
