import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsNumber, Min, IsOptional, IsBoolean, Matches } from 'class-validator';
import { Direction } from '../../enums/common.enum';

// ============== Currency Creation Input ==============
@InputType()
export class CurrencyInput {
	// ===== Required Fields =====
	@Field(() => String)
	@IsNotEmpty()
	@IsString()
	@Matches(/^[A-Z]{3}$/, { message: 'Currency code must be 3 uppercase letters (e.g., USD, EUR, KRW)' })
	currencyCode: string;

	/**
	 * Exchange rate: USD per internal point
	 * Example: If exchangeRate = 0.01, then 1 internal point = 0.01 USD
	 * This means internal points are the base currency
	 */
	@Field(() => Number)
	@IsNotEmpty()
	@IsNumber()
	@Min(0.0001, { message: 'Exchange rate must be greater than 0' })
	exchangeRate: number;

	// ===== Optional Fields =====
	@Field(() => Boolean, { nullable: true, defaultValue: true })
	@IsOptional()
	@IsBoolean()
	isActive?: boolean;
}

// ============== Search Inputs ==============
@InputType()
class CurrencySearch {
	@IsOptional()
	@Field(() => Boolean, { nullable: true })
	isActive?: boolean;
}

// ============== Inquiry Inputs ==============
@InputType()
export class CurrencyInquiry {
	// ===== Sorting =====
	@IsOptional()
	@Field(() => String, { nullable: true })
	sort?: string;

	@IsOptional()
	@Field(() => Direction, { nullable: true })
	direction?: Direction;

	// ===== Search =====
	@IsOptional()
	@Field(() => CurrencySearch, { nullable: true })
	search?: CurrencySearch;
}
