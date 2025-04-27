import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsEnum } from 'class-validator';
import { ViewGroup } from '../../enums/view.enum';

@InputType()
export class CreateViewInput {
	@Field(() => String)
	@IsNotEmpty()
	@IsString()
	memberId: string;

	@Field(() => ViewGroup)
	@IsNotEmpty()
	@IsEnum(ViewGroup)
	viewGroup: ViewGroup;

	@Field(() => String)
	@IsNotEmpty()
	@IsString()
	viewRefId: string;
}
