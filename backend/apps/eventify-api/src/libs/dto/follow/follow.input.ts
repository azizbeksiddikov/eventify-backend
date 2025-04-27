import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString } from 'class-validator';

@InputType()
export class CreateFollowInput {
	@Field(() => String)
	@IsNotEmpty()
	@IsString()
	followingId: string;

	@Field(() => String)
	@IsNotEmpty()
	@IsString()
	followerId: string;
}
