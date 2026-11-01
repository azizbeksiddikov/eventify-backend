import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';

// ===== DTOs =====
import { CurrencyEntity } from '../../libs/dto/currency/currency';

// ===== Types =====
import { CurrencyInput, CurrencyInquiry } from '../../libs/dto/currency/currency.input';
import { CurrencyUpdate } from '../../libs/dto/currency/currency.update';

// ===== Enums =====
import { Direction } from '../../libs/enums/common.enum';

// ===== Types =====
import { errorBody } from '../../libs/errors';
import { T } from '../../libs/types/common';

@Injectable()
export class CurrencyService {
	constructor(@InjectModel('Currency') private readonly currencyModel: Model<CurrencyEntity>) {}

	/**
	 * Create a new currency
	 */
	public async createCurrency(input: CurrencyInput): Promise<CurrencyEntity> {
		try {
			// Normalize currency code to uppercase
			const normalizedCode = input.currencyCode.toUpperCase();

			// Check if currency already exists
			const existingCurrency = await this.currencyModel.findOne({ currencyCode: normalizedCode }).exec();
			if (existingCurrency) {
				throw new BadRequestException(errorBody('CURRENCY_ALREADY_EXISTS', { currency: normalizedCode }));
			}

			const currency = await this.currencyModel.create({
				...input,
				currencyCode: normalizedCode,
			});
			return currency;
		} catch (error) {
			if (error instanceof BadRequestException) {
				throw error;
			}
			throw new InternalServerErrorException(errorBody('CREATE_FAILED'));
		}
	}

	/**
	 * Get a single currency by ID
	 */
	public async getCurrency(currencyId: ObjectId): Promise<CurrencyEntity | null> {
		const currency = await this.currencyModel.findById(currencyId).exec();
		if (!currency) {
			throw new NotFoundException(errorBody('CURRENCY_NOT_FOUND'));
		}
		return currency;
	}

	/**
	 * Get a currency by currency code
	 */
	public async getCurrencyByCode(currencyCode: string): Promise<CurrencyEntity | null> {
		const currency = await this.currencyModel.findOne({ currencyCode: currencyCode.toUpperCase() }).exec();
		if (!currency) {
			throw new NotFoundException(errorBody('CURRENCY_NOT_FOUND', { currency: currencyCode }));
		}
		return currency;
	}

	/**
	 * Get exchange rate by currency code
	 */
	public async getCurrencyRate(currencyCode: string): Promise<number> {
		const currency = await this.getCurrencyByCode(currencyCode);
		if (!currency) throw new NotFoundException(errorBody('CURRENCY_NOT_FOUND', { currency: currencyCode }));

		return currency.exchangeRate;
	}

	/**
	 * Convert internal points to a currency amount.
	 * The exchange rate is "points per 1 unit of currency" (the same rate ticket
	 * purchases use: points = price * rate), so amount = points / rate.
	 */
	public async convertPointsToCurrency(points: number, currencyCode: string): Promise<number> {
		const rate = await this.getCurrencyRate(currencyCode);
		if (!(rate > 0)) throw new BadRequestException(errorBody('EXCHANGE_RATE_INVALID'));
		return Math.round((points / rate) * 100) / 100;
	}

	/**
	 * Currency rules for an event. A currency is optional, but:
	 * - a named currency must exist in `currencies` (returned upper-cased);
	 * - a paid event (price > 0) must name one;
	 * - a free event may have none (null is returned, nothing is forced onto it).
	 */
	public async resolveEventCurrency(
		price: number | undefined | null,
		code: string | undefined | null,
	): Promise<string | null> {
		const named = code?.trim().toUpperCase();
		if (!named) {
			if (price && price > 0) throw new BadRequestException(errorBody('EVENT_CURRENCY_REQUIRED'));
			return null;
		}
		const found = await this.currencyModel.findOne({ currencyCode: named }).exec();
		if (!found) throw new BadRequestException(errorBody('CURRENCY_NOT_SUPPORTED'));
		return named;
	}

	/**
	 * Get all currencies with filtering and sorting
	 */
	public async getAllCurrencies(input: CurrencyInquiry): Promise<CurrencyEntity[]> {
		const match: T = {};

		// Apply isActive filter if provided
		if (input.search?.isActive !== undefined) {
			match.isActive = input.search.isActive;
		}

		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		const result = await this.currencyModel.find(match).sort(sort).exec();

		return result;
	}

	/**
	 * Update a currency
	 */
	public async updateCurrency(input: CurrencyUpdate): Promise<CurrencyEntity | null> {
		const currency = await this.currencyModel.findById(input._id).exec();
		if (!currency) {
			throw new NotFoundException(errorBody('CURRENCY_NOT_FOUND'));
		}

		// If currencyCode is being updated, check if new code already exists
		if (input.currencyCode) {
			const normalizedCode = input.currencyCode.toUpperCase();
			if (normalizedCode !== currency.currencyCode) {
				const existingCurrency = await this.currencyModel
					.findOne({ currencyCode: normalizedCode, _id: { $ne: input._id } })
					.exec();
				if (existingCurrency) {
					throw new BadRequestException(errorBody('CURRENCY_ALREADY_EXISTS', { currency: normalizedCode }));
				}
				input.currencyCode = normalizedCode;
			}
		}

		// Validate exchange rate if provided
		if (input.exchangeRate !== undefined && input.exchangeRate <= 0) {
			throw new BadRequestException(errorBody('EXCHANGE_RATE_INVALID'));
		}

		const updatedCurrency = await this.currencyModel.findByIdAndUpdate(input._id, input, { new: true }).exec();
		return updatedCurrency;
	}

	/**
	 * Remove (delete) a currency
	 */
	public async removeCurrency(currencyId: ObjectId): Promise<CurrencyEntity | null> {
		const currency = await this.currencyModel.findByIdAndDelete(currencyId).exec();
		if (!currency) {
			throw new NotFoundException(errorBody('CURRENCY_NOT_FOUND'));
		}
		return currency;
	}
}
