import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

@ObjectType()
export class Message {
	@Field()
	_id: string;

	@Field()
	senderId: string;

	@Field()
	receiverId: string;

	@Field()
	content: string;

	@Field({ nullable: true })
	eventId?: string;

	@Field()
	isRead: boolean;

	@Field()
	createdAt: Date;
}

@InputType()
export class CreateMessageDto {
	@Field()
	@IsString()
	@IsNotEmpty()
	senderId: string;

	@Field()
	@IsString()
	@IsNotEmpty()
	receiverId: string;

	@Field()
	@IsString()
	@IsNotEmpty()
	content: string;

	@Field({ nullable: true })
	@IsString()
	@IsOptional()
	eventId?: string;
}

@InputType()
export class UpdateMessageDto {
	@Field({ nullable: true })
	@IsString()
	@IsOptional()
	content?: string;

	@Field({ nullable: true })
	isRead?: boolean;
}
