import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsEnum } from 'class-validator';
import { ViewGroup } from '../../enums/view.enum';
import { ObjectId } from 'mongoose';

@InputType()
export class ViewInput {
	@Field(() => String)
	@IsNotEmpty()
	@IsString()
	memberId: ObjectId;

	@Field(() => ViewGroup)
	@IsNotEmpty()
	@IsEnum(ViewGroup)
	viewGroup: ViewGroup;

	@Field(() => String)
	@IsNotEmpty()
	@IsString()
	viewRefId: ObjectId;
}
