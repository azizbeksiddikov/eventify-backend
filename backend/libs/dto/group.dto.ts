import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { GroupType } from '../enums/group.enum';

@InputType()
export class CreateGroupDto {
  @Field()
  @IsString()
  @IsNotEmpty()
  name: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  description: string;

  @Field(() => GroupType)
  @IsEnum(GroupType)
  @IsNotEmpty()
  type: GroupType;

  @Field(() => [String], { nullable: true })
  @IsString({ each: true })
  @IsOptional()
  categories?: string[];
}

@InputType()
export class UpdateGroupDto {
  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  name?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  description?: string;

  @Field(() => GroupType, { nullable: true })
  @IsEnum(GroupType)
  @IsOptional()
  type?: GroupType;

  @Field(() => [String], { nullable: true })
  @IsString({ each: true })
  @IsOptional()
  categories?: string[];
} 