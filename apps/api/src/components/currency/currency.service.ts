import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';

// ===== Enums =====
import { Message } from '../../libs/enums/common.enum';

// ===== DTOs =====
import { CurrencyEntity } from '../../libs/dto/currency/currency';

// ===== Types =====
import { CurrencyInput, CurrencyInquiry } from '../../libs/dto/currency/currency.input';
import { CurrencyUpdate } from '../../libs/dto/currency/currency.update';

// ===== Enums =====
import { Direction } from '../../libs/enums/common.enum';

// ===== Types =====
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
				throw new BadRequestException(`Currency ${normalizedCode} already exists.`);
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
			throw new InternalServerErrorException(Message.CREATE_FAILED);
		}
	}

	/**
	 * Get a single currency by ID
	 */
	public async getCurrency(currencyId: ObjectId): Promise<CurrencyEntity | null> {
		const currency = await this.currencyModel.findById(currencyId).exec();
		if (!currency) {
			throw new NotFoundException('Currency not found.');
		}
		return currency;
	}

	/**
	 * Get a currency by currency code
	 */
	public async getCurrencyByCode(currencyCode: string): Promise<CurrencyEntity | null> {
		const currency = await this.currencyModel.findOne({ currencyCode: currencyCode.toUpperCase() }).exec();
		if (!currency) {
			throw new NotFoundException(`Currency ${currencyCode} not found.`);
		}
		return currency;
	}

	/**
	 * Get exchange rate by currency code
	 */
	public async getCurrencyRate(currencyCode: string): Promise<number> {
		const currency = await this.getCurrencyByCode(currencyCode);
		if (!currency) throw new NotFoundException(`Currency ${currencyCode} not found.`);

		return currency.exchangeRate;
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
			throw new NotFoundException('Currency not found.');
		}

		// If currencyCode is being updated, check if new code already exists
		if (input.currencyCode) {
			const normalizedCode = input.currencyCode.toUpperCase();
			if (normalizedCode !== currency.currencyCode) {
				const existingCurrency = await this.currencyModel
					.findOne({ currencyCode: normalizedCode, _id: { $ne: input._id } })
					.exec();
				if (existingCurrency) {
					throw new BadRequestException(`Currency ${normalizedCode} already exists.`);
				}
				input.currencyCode = normalizedCode;
			}
		}

		// Validate exchange rate if provided
		if (input.exchangeRate !== undefined && input.exchangeRate <= 0) {
			throw new BadRequestException('Exchange rate must be positive.');
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
			throw new NotFoundException('Currency not found.');
		}
		return currency;
	}
}
