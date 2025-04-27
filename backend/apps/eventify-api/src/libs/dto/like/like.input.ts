import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsEnum } from 'class-validator';
import { LikeGroup } from '../../enums/like.enum';
import { ObjectId } from 'mongoose';

@InputType()
export class LikeInput {
	@Field(() => String)
	@IsNotEmpty()
	@IsString()
	memberId: ObjectId;

	@Field(() => LikeGroup)
	@IsNotEmpty()
	@IsEnum(LikeGroup)
	likeGroup: LikeGroup;

	@Field(() => String)
	@IsNotEmpty()
	@IsString()
	likeRefId: ObjectId;
}
