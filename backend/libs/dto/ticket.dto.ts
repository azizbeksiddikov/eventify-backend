import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { TicketStatus } from '../enums/event.enum';

@InputType()
export class CreateTicketDto {
  @Field()
  @IsString()
  @IsNotEmpty()
  eventId: string;

  @Field()
  @IsNumber()
  @Min(1)
  quantity: number;
}

@InputType()
export class UpdateTicketDto {
  @Field(() => TicketStatus, { nullable: true })
  @IsEnum(TicketStatus)
  @IsOptional()
  status?: TicketStatus;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  notes?: string;
} 