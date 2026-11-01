import { BadRequestException } from '@nestjs/common';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CurrencyService } from '../apps/api/src/components/currency/currency.service';
import { Message } from '../apps/api/src/libs/enums/common.enum';
import { errorBody, formatGraphQLError } from '../apps/api/src/libs/errors';

describe('errorBody', () => {
	it('uses the Message key as the code and the Message value as the English text', () => {
		assert.deepEqual(errorBody('EVENT_FULL'), { code: 'EVENT_FULL', message: Message.EVENT_FULL });
	});

	it('fills {placeholders} in the text and passes params on', () => {
		assert.deepEqual(errorBody('CURRENCY_ALREADY_EXISTS', { currency: 'USD' }), {
			code: 'CURRENCY_ALREADY_EXISTS',
			message: 'Currency USD already exists.',
			params: { currency: 'USD' },
		});
	});
});

describe('formatGraphQLError', () => {
	it('sends the specific code, text and params from an exception built with errorBody', () => {
		const exception = new BadRequestException(errorBody('INSUFFICIENT_POINTS'));
		const out = formatGraphQLError({
			message: 'Bad Request Exception',
			extensions: { code: 'BAD_REQUEST', response: exception.getResponse() as Record<string, unknown> },
		});
		assert.equal(out.code, 'INSUFFICIENT_POINTS');
		assert.equal(out.extensions.code, 'INSUFFICIENT_POINTS');
		assert.equal(out.message, Message.INSUFFICIENT_POINTS);
	});

	it('keeps the params for the client to translate', () => {
		const exception = new BadRequestException(errorBody('CURRENCY_ALREADY_EXISTS', { currency: 'EUR' }));
		const out = formatGraphQLError({
			message: 'x',
			extensions: { code: 'BAD_REQUEST', response: exception.getResponse() as Record<string, unknown> },
		});
		assert.deepEqual(out.extensions.params, { currency: 'EUR' });
	});

	it('keeps the framework code and the first validation message for plain exceptions', () => {
		const out = formatGraphQLError({
			message: 'Bad Request Exception',
			extensions: { code: 'BAD_REQUEST', response: { message: ['username must be a string', 'second'] } },
		});
		assert.equal(out.code, 'BAD_REQUEST');
		assert.equal(out.message, 'username must be a string');
		assert.equal(out.extensions.params, undefined);
	});
});

describe('services throw coded errors', () => {
	it('rejects a duplicate currency with CURRENCY_ALREADY_EXISTS and the currency as a param', async () => {
		const chain = { exec: () => Promise.resolve({ currencyCode: 'USD' }) };
		const service = new CurrencyService({ findOne: () => chain } as never);
		await assert.rejects(
			() => service.createCurrency({ currencyCode: 'usd', exchangeRate: 10 } as never),
			(err: BadRequestException) => {
				const body = err.getResponse() as { code?: string; params?: Record<string, string> };
				return body.code === 'CURRENCY_ALREADY_EXISTS' && body.params?.currency === 'USD';
			},
		);
	});
});

describe('Message enum', () => {
	it('keys are upper-case codes and values are unique, so a code never means two texts', () => {
		const keys = Object.keys(Message);
		assert.ok(keys.every((k) => /^[A-Z][A-Z0-9_]*$/.test(k)));
		const values = Object.values(Message);
		assert.equal(new Set(values).size, values.length, 'two codes share the same English text');
	});
});
