import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { IsNotEmpty, IsString } from 'class-validator';

@ObjectType()
export class Follow {
	@Field()
	_id: string;

	@Field()
	followingId: string;

	@Field()
	followerId: string;

	@Field()
	createdAt: Date;

	@Field()
	updatedAt: Date;
}

@InputType()
export class CreateFollowDto {
	@Field()
	@IsString()
	@IsNotEmpty()
	followingId: string;

	@Field()
	@IsString()
	@IsNotEmpty()
	followerId: string;
}
