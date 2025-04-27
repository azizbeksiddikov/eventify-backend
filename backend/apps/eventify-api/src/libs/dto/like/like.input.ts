import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsEnum } from 'class-validator';
import { LikeGroup } from '../../enums/like.enum';

@InputType()
export class CreateLikeInput {
	@Field(() => String)
	@IsNotEmpty()
	@IsString()
	memberId: string;

	@Field(() => LikeGroup)
	@IsNotEmpty()
	@IsEnum(LikeGroup)
	likeGroup: LikeGroup;

	@Field(() => String)
	@IsNotEmpty()
	@IsString()
	likeRefId: string;
}
