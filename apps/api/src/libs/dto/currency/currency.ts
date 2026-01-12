import { Field, ObjectType } from '@nestjs/graphql';
import type { ObjectId } from 'mongoose';
import { TotalCounter } from '../member/member';

@ObjectType()
export class CurrencyEntity {
	// ===== Basic Information =====
	@Field(() => String)
	_id: ObjectId;

	// ===== Currency Information =====
	@Field(() => String)
	currencyCode: string;

	/**
	 * Exchange rate: USD per internal point
	 * Example: If exchangeRate = 0.01, then 1 internal point = 0.01 USD
	 * This means internal points are the base currency
	 */
	@Field(() => Number)
	exchangeRate: number;

	@Field(() => Boolean)
	isActive: boolean;

	// ===== Timestamps =====
	@Field(() => Date)
	createdAt: Date;

	@Field(() => Date)
	updatedAt: Date;
}

@ObjectType()
export class Currencies {
	@Field(() => [CurrencyEntity])
	list: CurrencyEntity[];

	@Field(() => [TotalCounter])
	metaCounter: TotalCounter[];
}
