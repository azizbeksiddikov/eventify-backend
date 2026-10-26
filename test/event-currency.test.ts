import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CurrencyService } from '../apps/api/src/components/currency/currency.service';
import { TicketService } from '../apps/api/src/components/ticket/ticket.service';
import { EventService } from '../apps/api/src/components/event/event.service';

type Doc = { currencyCode: string; exchangeRate: number };
const CURRENCIES: Doc[] = [
	{ currencyCode: 'USD', exchangeRate: 10 },
	{ currencyCode: 'KRW', exchangeRate: 0.001 },
];

// findOne({currencyCode}) looks the code up; findOne({isActive}) returns the first (default) currency.
const currencyService = (docs: Doc[] = CURRENCIES) => {
	const model = {
		findOne: (q: { currencyCode?: string }) => {
			const doc = q.currencyCode ? docs.find((d) => d.currencyCode === q.currencyCode) : docs[0];
			const chain = { sort: () => chain, lean: () => chain, exec: async () => doc ?? null };
			return chain;
		},
	};
	return new CurrencyService(model as never);
};

describe('CurrencyService.resolveEventCurrency', () => {
	it('upper-cases a known code', async () => {
		assert.equal(await currencyService().resolveEventCurrency(5, ' krw '), 'KRW');
	});
	it('rejects an unknown code with a plain message', async () => {
		await assert.rejects(() => currencyService().resolveEventCurrency(5, 'EUR'), /not supported/);
	});
	it('falls back to the default currency for free and paid events', async () => {
		assert.equal(await currencyService().resolveEventCurrency(0, undefined), 'USD');
		assert.equal(await currencyService().resolveEventCurrency(20, ''), 'USD');
	});
	it('with no currencies configured: free is allowed, paid is rejected', async () => {
		assert.equal(await currencyService([]).resolveEventCurrency(0, null), null);
		await assert.rejects(() => currencyService([]).resolveEventCurrency(5, null), /No currency is configured/);
	});
});

describe('TicketService.createTicket', () => {
	const build = (event: Record<string, unknown>, points: number) => {
		const created: Record<string, unknown>[] = [];
		const edits: Record<string, unknown>[] = [];
		const service = new TicketService(
			{ create: async (t: Record<string, unknown>) => (created.push(t), t) } as never,
			{ upsertNotification: async () => undefined } as never,
			{
				getMemberPoints: async () => points,
				memberStatsEditor: async (e: Record<string, unknown>) => edits.push(e),
			} as never,
			{ getSimpleEvent: async () => event, eventStatsEditor: async () => event } as never,
			currencyService(),
		);
		return { service, created, edits };
	};
	const base = { attendeeCount: 0, eventCapacity: 100, memberId: 'org' };

	it('sells a free event that has no currency (default is stamped on the ticket, cost 0)', async () => {
		const { service, created } = build({ ...base, eventPrice: 0, eventCurrency: null }, 0);
		await service.createTicket('m' as never, { eventId: 'e', ticketQuantity: 1 } as never);
		assert.equal(created[0].ticketCurrency, 'USD');
		assert.equal(created[0].totalPrice, 0);
	});

	it('prices a paid event with no currency using the default currency', async () => {
		const { service, created } = build({ ...base, eventPrice: 2, eventCurrency: null }, 100);
		await service.createTicket('m' as never, { eventId: 'e', ticketQuantity: 2 } as never);
		assert.equal(created[0].ticketCurrency, 'USD');
		assert.equal(created[0].totalPrice, 40);
	});

	it('refuses when the member lacks points', async () => {
		const { service } = build({ ...base, eventPrice: 5, eventCurrency: 'USD' }, 10);
		await assert.rejects(
			() => service.createTicket('m' as never, { eventId: 'e', ticketQuantity: 1 } as never),
			/enough points/,
		);
	});
});

describe('EventService.createEvent', () => {
	const build = () => {
		const created: Record<string, unknown>[] = [];
		const service = new EventService(
			{ create: async (e: Record<string, unknown>) => (created.push(e), { _id: 'e1', ...e }) } as never,
			{} as never,
			{ scheduleEventJobs: async () => undefined } as never,
			{} as never,
			{} as never,
			{} as never,
			{ memberStatsEditor: async () => undefined } as never,
			{} as never,
			currencyService(),
		);
		return { service, created };
	};
	const input = { eventName: 'x', eventCategories: [], eventTags: [] };

	it('stores the default currency on a free event created without one', async () => {
		const { service, created } = build();
		await service.createEvent('m' as never, { ...input, eventPrice: 0 } as never).catch(() => undefined);
		assert.equal(created[0]?.eventCurrency, 'USD');
	});

	it('keeps a chosen currency and rejects an unsupported one', async () => {
		const { service, created } = build();
		await service
			.createEvent('m' as never, { ...input, eventPrice: 5, eventCurrency: 'krw' } as never)
			.catch(() => undefined);
		assert.equal(created[0]?.eventCurrency, 'KRW');
		await assert.rejects(
			() => service.createEvent('m' as never, { ...input, eventPrice: 5, eventCurrency: 'EUR' } as never),
			/not supported/,
		);
	});
});
