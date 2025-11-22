import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';

// ===== Guards & Decorators =====
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

// ===== DTOs =====
import { Faq, FaqByGroup } from '../../libs/dto/faq/faq';
import { FaqInput } from '../../libs/dto/faq/faq.input';
import { FaqUpdate } from '../../libs/dto/faq/faq.update';
import { MemberType } from '../../libs/enums/member.enum';

// ===== Services =====
import { FaqService } from './faq.service';

// ===== Config =====
import { shapeIntoMongoObjectId } from '../../libs/config';

@Resolver()
export class FaqResolver {
	constructor(private readonly faqService: FaqService) {}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => Faq)
	public async createFaq(@Args('input') input: FaqInput): Promise<Faq> {
		console.log('Mutation: createFaq');
		return await this.faqService.createFaq(input);
	}

	@Query(() => [FaqByGroup])
	public async getFaqs(): Promise<FaqByGroup[]> {
		console.log('Query: getFaqs');
		return await this.faqService.getFaqs();
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Query(() => [FaqByGroup])
	public async getAllFaqsByAdmin(): Promise<FaqByGroup[]> {
		console.log('Query: getAllFaqsByAdmin');
		return await this.faqService.getAllFaqsByAdmin();
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => Faq)
	public async updateFaq(@Args('input') input: FaqUpdate): Promise<Faq | null> {
		console.log('Mutation: updateFaq');
		input._id = shapeIntoMongoObjectId(input._id);
		return await this.faqService.updateFaq(input);
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => Faq)
	public async removeFaq(@Args('input') input: string): Promise<Faq | null> {
		console.log('Mutation: removeFaq');
		const faqId = shapeIntoMongoObjectId(input);
		return await this.faqService.removeFaq(faqId);
	}
}
