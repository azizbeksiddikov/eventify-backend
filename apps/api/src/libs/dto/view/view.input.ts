import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsEnum } from 'class-validator';
import { ViewGroup } from '../../enums/view.enum';
import type { ObjectId } from 'mongoose';

// ============== View Creation Input ==============
@InputType()
export class ViewInput {
	// ===== Type and Group =====
	@Field(() => ViewGroup)
	@IsNotEmpty()
	@IsEnum(ViewGroup)
	viewGroup: ViewGroup;

	// ===== References =====
	@Field(() => String)
	@IsNotEmpty()
	@IsString()
	memberId: ObjectId;

	@Field(() => String)
	@IsNotEmpty()
	@IsString()
	viewRefId: ObjectId;
}
