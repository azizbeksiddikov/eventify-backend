import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';
import { FaqGroup, FaqStatus } from '../../enums/faq.enum';

// ============== Faq Creation Input ==============
@InputType()
export class FaqInput {
	// ===== Type and Status =====
	@IsNotEmpty()
	@Field(() => FaqGroup)
	faqGroup: FaqGroup;

	@IsNotEmpty()
	@Field(() => FaqStatus)
	faqStatus: FaqStatus;

	// ===== Content =====
	@IsNotEmpty()
	@Field(() => String)
	faqQuestion: string;

	@IsNotEmpty()
	@Field(() => String)
	faqAnswer: string;
}
