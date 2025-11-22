import { Schema } from 'mongoose';
import { FaqGroup, FaqStatus } from '../libs/enums/faq.enum';

const FaqSchema = new Schema(
	{
		// ===== Type and Status =====
		faqGroup: {
			type: String,
			enum: FaqGroup,
			required: true,
		},

		faqStatus: {
			type: String,
			enum: FaqStatus,
			required: true,
		},

		// ===== Content =====
		faqQuestion: {
			type: String,
			required: true,
		},

		faqAnswer: {
			type: String,
			required: true,
		},
	},
	{ timestamps: true, collection: 'faqs' },
);

export default FaqSchema;
