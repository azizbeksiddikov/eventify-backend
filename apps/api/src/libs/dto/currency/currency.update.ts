import type { ObjectId } from 'mongoose';
import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsString, IsNumber, Min, IsBoolean, Matches } from 'class-validator';

@InputType()
export class CurrencyUpdate {
	// ===== Identification =====
	@IsNotEmpty()
	@Field(() => String)
	_id: ObjectId;

	// ===== Optional Fields =====
	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	@Matches(/^[A-Z]{3}$/, { message: 'Currency code must be 3 uppercase letters (e.g., USD, EUR, KRW)' })
	currencyCode?: string;

	/**
	 * Exchange rate: USD per internal point
	 * Example: If exchangeRate = 0.01, then 1 internal point = 0.01 USD
	 * This means internal points are the base currency
	 */
	@Field(() => Number, { nullable: true })
	@IsOptional()
	@IsNumber()
	@Min(0.0001, { message: 'Exchange rate must be greater than 0' })
	exchangeRate?: number;

	@Field(() => Boolean, { nullable: true })
	@IsOptional()
	@IsBoolean()
	isActive?: boolean;
}
