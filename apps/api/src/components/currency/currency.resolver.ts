import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrencyService } from './currency.service';

@Resolver()
export class CurrencyResolver {
	constructor(private readonly currencyService: CurrencyService) {}

	@Query(() => String)
	public async getCurrencies(): Promise<string> {
		const currencies = await this.currencyService.getAllCurrencies();
		return JSON.stringify(currencies);
	}

	@Mutation(() => String) // Temp return type
	public async updateCurrencyRate(
		@Args('currencyCode') currencyCode: String,
		@Args('exchangeRate') exchangeRate: number,
	): Promise<string> {
		// Cast String to Currency enum manually or trust input for now
		const result = await this.currencyService.updateCurrencyRate(currencyCode as any, exchangeRate);
		return JSON.stringify(result);
	}
}
