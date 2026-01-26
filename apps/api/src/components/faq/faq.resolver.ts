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
import { logger } from '../../libs/logger';

@Resolver()
export class FaqResolver {
	constructor(private readonly faqService: FaqService) {}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => Faq)
	public async createFaq(@Args('input') input: FaqInput): Promise<Faq> {
		logger.debug('FaqResolver', 'Mutation: createFaq');
		return await this.faqService.createFaq(input);
	}

	@Query(() => [FaqByGroup])
	public async getFaqs(): Promise<FaqByGroup[]> {
		logger.debug('FaqResolver', 'Query: getFaqs');
		return await this.faqService.getFaqs();
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Query(() => [FaqByGroup])
	public async getAllFaqsByAdmin(): Promise<FaqByGroup[]> {
		logger.debug('FaqResolver', 'Query: getAllFaqsByAdmin');
		return await this.faqService.getAllFaqsByAdmin();
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => Faq)
	public async updateFaq(@Args('input') input: FaqUpdate): Promise<Faq | null> {
		logger.debug('FaqResolver', 'Mutation: updateFaq');
		input._id = shapeIntoMongoObjectId(input._id);
		return await this.faqService.updateFaq(input);
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => Faq)
	public async removeFaq(@Args('input') input: string): Promise<Faq | null> {
		logger.debug('FaqResolver', 'Mutation: removeFaq');
		const faqId = shapeIntoMongoObjectId(input);
		return await this.faqService.removeFaq(faqId);
	}
}
