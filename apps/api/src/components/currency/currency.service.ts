import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Currency } from '../../libs/enums/common.enum';

@Injectable()
export class CurrencyService {
	constructor(@InjectModel('Currency') private readonly currencyModel: Model<any>) {}

	public async getCurrencyRate(currencyCode: Currency): Promise<number> {
		const currency = await this.currencyModel.findOne({ currencyCode, isActive: true }).exec();
		if (!currency) {
			// Fallback to 1 if no currency defined (or handle specific logic)
			// Ideally, we should seed base currencies.
			return 1;
		}
		return currency.exchangeRate;
	}

	public async updateCurrencyRate(currencyCode: Currency, rate: number): Promise<any> {
		if (rate <= 0) throw new BadRequestException('Rate must be positive.');
		
		return await this.currencyModel.findOneAndUpdate(
			{ currencyCode },
			{ exchangeRate: rate, isActive: true },
			{ new: true, upsert: true }
		).exec();
	}

	public async getAllCurrencies(): Promise<any[]> {
		return await this.currencyModel.find().exec();
	}
}
