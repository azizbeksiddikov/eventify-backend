import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';

// ===== Guards & Decorators =====
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MemberType } from '../../libs/enums/member.enum';

// ===== DTOs =====
import { CurrencyEntity } from '../../libs/dto/currency/currency';
import { CurrencyInput, CurrencyInquiry } from '../../libs/dto/currency/currency.input';
import { CurrencyUpdate } from '../../libs/dto/currency/currency.update';

// ===== Services =====
import { CurrencyService } from './currency.service';

// ===== Config =====
import { shapeIntoMongoObjectId } from '../../libs/config';
import { WithoutGuard } from '../auth/guards/without.guard';
import { logger } from '../../libs/logger';

@Resolver()
export class CurrencyResolver {
	constructor(private readonly currencyService: CurrencyService) {}

	@UseGuards(WithoutGuard)
	@Query(() => [CurrencyEntity])
	public async getCurrencies(@Args('input') input: CurrencyInquiry): Promise<CurrencyEntity[]> {
		logger.debug('CurrencyResolver', 'Query: getCurrencies');
		return await this.currencyService.getAllCurrencies(input);
	}

	@UseGuards(WithoutGuard)
	@Query(() => CurrencyEntity)
	public async getCurrency(@Args('input') input: string): Promise<CurrencyEntity | null> {
		logger.debug('CurrencyResolver', 'Query: getCurrency');
		const currencyId = shapeIntoMongoObjectId(input);
		return await this.currencyService.getCurrency(currencyId);
	}

	@UseGuards(WithoutGuard)
	@Query(() => CurrencyEntity)
	public async getCurrencyByCode(@Args('input') currencyCode: string): Promise<CurrencyEntity | null> {
		logger.debug('CurrencyResolver', 'Query: getCurrencyByCode');
		return await this.currencyService.getCurrencyByCode(currencyCode);
	}

	// ============== Admin Methods ==============

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => CurrencyEntity)
	public async createCurrency(@Args('input') input: CurrencyInput): Promise<CurrencyEntity> {
		logger.debug('CurrencyResolver', 'Mutation: createCurrency');
		return await this.currencyService.createCurrency(input);
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => CurrencyEntity)
	public async updateCurrency(@Args('input') input: CurrencyUpdate): Promise<CurrencyEntity | null> {
		logger.debug('CurrencyResolver', 'Mutation: updateCurrency');
		input._id = shapeIntoMongoObjectId(input._id);
		return await this.currencyService.updateCurrency(input);
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => CurrencyEntity)
	public async removeCurrency(@Args('input') input: string): Promise<CurrencyEntity | null> {
		logger.debug('CurrencyResolver', 'Mutation: removeCurrency');
		const currencyId = shapeIntoMongoObjectId(input);
		return await this.currencyService.removeCurrency(currencyId);
	}
}
