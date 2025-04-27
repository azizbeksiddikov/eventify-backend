import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { LikeGroup } from '../enums/common.enum';

@ObjectType()
export class Like {
	@Field()
	_id: string;

	@Field()
	memberId: string;

	@Field(() => LikeGroup)
	likeGroup: LikeGroup;

	@Field()
	likeRefId: string;

	@Field()
	createdAt: Date;

	@Field()
	updatedAt: Date;
}

@InputType()
export class CreateLikeDto {
	@Field()
	@IsString()
	@IsNotEmpty()
	memberId: string;

	@Field(() => LikeGroup)
	@IsEnum(LikeGroup)
	likeGroup: LikeGroup;

	@Field()
	@IsString()
	@IsNotEmpty()
	likeRefId: string;
}
