import type { ObjectId } from 'mongoose';
import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional } from 'class-validator';
import { FaqGroup, FaqStatus } from '../../enums/faq.enum';

@InputType()
export class FaqUpdate {
	// ===== Identification =====
	@IsNotEmpty()
	@Field(() => String)
	_id: ObjectId;

	// ===== Type and Status =====
	@IsOptional()
	@Field(() => FaqGroup, { nullable: true })
	faqGroup?: FaqGroup;

	@IsOptional()
	@Field(() => FaqStatus, { nullable: true })
	faqStatus?: FaqStatus;

	// ===== Content ===	==
	@IsOptional()
	@Field(() => String, { nullable: true })
	faqQuestion?: string;

	@IsOptional()
	@Field(() => String, { nullable: true })
	faqAnswer?: string;
}
