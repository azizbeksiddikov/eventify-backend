import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsEnum } from 'class-validator';
import { LikeGroup } from '../../enums/like.enum';
import { ObjectId } from 'mongoose';

// ============== Like Creation Input ==============
@InputType()
export class LikeInput {
	// ===== Type and Group =====
	@Field(() => LikeGroup)
	@IsNotEmpty()
	@IsEnum(LikeGroup)
	likeGroup: LikeGroup;

	// ===== References =====
	@Field(() => String)
	@IsNotEmpty()
	@IsString()
	memberId: ObjectId;

	@Field(() => String)
	@IsNotEmpty()
	@IsString()
	likeRefId: ObjectId;
}
