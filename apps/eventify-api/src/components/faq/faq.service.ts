import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';

// ===== Enums =====
import { Message } from '../../libs/enums/common.enum';
import { FaqGroup, FaqStatus } from '../../libs/enums/faq.enum';

// ===== DTOs =====
import { Faq, FaqByGroup } from '../../libs/dto/faq/faq';

// ===== Types =====
import { FaqUpdate } from '../../libs/dto/faq/faq.update';
import { FaqInput } from '../../libs/dto/faq/faq.input';

@Injectable()
export class FaqService {
	constructor(@InjectModel('Faq') private readonly faqModel: Model<Faq>) {}

	public async createFaq(input: FaqInput): Promise<Faq> {
		try {
			const faq = await this.faqModel.create(input);
			return faq;
		} catch (error) {
			throw new InternalServerErrorException(Message.CREATE_FAILED);
		}
	}

	public async getFaqs(): Promise<FaqByGroup[]> {
		const faqs = await this.faqModel.find({ faqStatus: FaqStatus.ACTIVE });
		return this.divideFaqsByGroup(faqs);
	}

	public async getAllFaqsByAdmin(): Promise<FaqByGroup[]> {
		const faqs = await this.faqModel.find();
		return this.divideFaqsByGroup(faqs);
	}

	private async divideFaqsByGroup(faqs: Faq[]): Promise<FaqByGroup[]> {
		const result: FaqByGroup[] = Object.values(FaqGroup).map((group) => ({
			faqGroup: group,
			faqs: [],
		}));

		faqs.forEach((faq) => {
			const faqGroup = result.find((group) => group.faqGroup === faq.faqGroup);
			if (faqGroup) faqGroup.faqs.push(faq);
		});
		return result;
	}

	public async updateFaq(input: FaqUpdate): Promise<Faq> {
		const faq = await this.faqModel.findByIdAndUpdate(input._id, input, { new: true });
		return faq;
	}

	public async removeFaq(faqId: ObjectId): Promise<Faq> {
		return await this.faqModel.findByIdAndDelete(faqId);
	}
}
