import { Field, InputType } from '@nestjs/graphql';
import { IsDate, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { EventStatus } from '../enums/event.enum';

@InputType()
export class CreateEventDto {
  @Field()
  @IsString()
  @IsNotEmpty()
  name: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  description: string;

  @Field()
  @IsDate()
  @IsNotEmpty()
  startDate: Date;

  @Field()
  @IsDate()
  @IsNotEmpty()
  endDate: Date;

  @Field()
  @IsString()
  @IsNotEmpty()
  venue: string;

  @Field()
  @IsNumber()
  @Min(1)
  capacity: number;

  @Field()
  @IsString()
  @IsNotEmpty()
  groupId: string;

  @Field(() => [String], { nullable: true })
  @IsString({ each: true })
  @IsOptional()
  categories?: string[];
}

@InputType()
export class UpdateEventDto {
  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  name?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  description?: string;

  @Field({ nullable: true })
  @IsDate()
  @IsOptional()
  startDate?: Date;

  @Field({ nullable: true })
  @IsDate()
  @IsOptional()
  endDate?: Date;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  venue?: string;

  @Field({ nullable: true })
  @IsNumber()
  @Min(1)
  @IsOptional()
  capacity?: number;

  @Field(() => EventStatus, { nullable: true })
  @IsEnum(EventStatus)
  @IsOptional()
  status?: EventStatus;

  @Field(() => [String], { nullable: true })
  @IsString({ each: true })
  @IsOptional()
  categories?: string[];
} 