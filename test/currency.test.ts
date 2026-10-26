import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CurrencyService } from '../apps/api/src/components/currency/currency.service';
import { MemberResolver } from '../apps/api/src/components/member/member.resolver';

// Minimal mongoose-like model: findOne() returns a chain that resolves to `doc`.
const modelWith = (doc: unknown) => {
	const chain = { sort: () => chain, lean: () => chain, exec: async () => doc };
	return { findOne: () => chain } as never;
};

describe('CurrencyService', () => {
	it('converts points with "points per currency unit" (100 points at rate 10 = 10)', async () => {
		const service = new CurrencyService(modelWith({ currencyCode: 'USD', exchangeRate: 10 }));
		assert.equal(await service.convertPointsToCurrency(100, 'USD'), 10);
	});

	it('rounds to two decimals', async () => {
		const service = new CurrencyService(modelWith({ currencyCode: 'USD', exchangeRate: 3 }));
		assert.equal(await service.convertPointsToCurrency(10, 'USD'), 3.33);
	});

	it('rejects a zero exchange rate instead of dividing by zero', async () => {
		const service = new CurrencyService(modelWith({ currencyCode: 'USD', exchangeRate: 0 }));
		await assert.rejects(() => service.convertPointsToCurrency(10, 'USD'), /positive/);
	});

	it('rejects an unknown currency code', async () => {
		const service = new CurrencyService(modelWith(null));
		await assert.rejects(() => service.convertPointsToCurrency(10, 'XXX'), /not found/);
	});

	it('returns the oldest active currency as the default, or null when none', async () => {
		assert.equal(await new CurrencyService(modelWith({ currencyCode: 'USD' })).getDefaultCurrencyCode(), 'USD');
		assert.equal(await new CurrencyService(modelWith(null)).getDefaultCurrencyCode(), null);
	});
});

describe('MemberResolver.getMemberPointsInCurrency', () => {
	it('converts the caller own points', async () => {
		const resolver = new MemberResolver(
			{ getMemberPoints: async (id: unknown) => (id === 'me' ? 250 : 0) } as never,
			{ convertPointsToCurrency: async (p: number, c: string) => (c === 'USD' ? p / 10 : 0) } as never,
		);
		assert.equal(await resolver.getMemberPointsInCurrency('USD', 'me' as never), 25);
	});
});
