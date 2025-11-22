import { Field, ObjectType } from '@nestjs/graphql';
import { ObjectId } from 'mongoose';
import { FaqGroup, FaqStatus } from '../../enums/faq.enum';

@ObjectType()
export class Faq {
	// ===== Basic Information =====
	@Field(() => String)
	_id: ObjectId;

	// ===== Type and Status =====
	@Field(() => FaqGroup)
	faqGroup: FaqGroup;

	@Field(() => FaqStatus)
	faqStatus: FaqStatus;

	// ===== Content =====
	@Field(() => String)
	faqQuestion: string;

	@Field(() => String)
	faqAnswer: string;

	// ===== Timestamps =====
	@Field(() => Date)
	createdAt: Date;

	@Field(() => Date)
	updatedAt: Date;
}

@ObjectType()
export class FaqByGroup {
	// ===== Group =====
	@Field(() => FaqGroup)
	faqGroup: FaqGroup;

	// ===== Faqs =====
	@Field(() => [Faq])
	faqs: Faq[];
}
