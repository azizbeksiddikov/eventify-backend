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
	it('a free event may have no currency and gets none forced on it', async () => {
		assert.equal(await currencyService().resolveEventCurrency(0, undefined), null);
		assert.equal(await currencyService().resolveEventCurrency(undefined, ''), null);
		assert.equal(await currencyService([]).resolveEventCurrency(0, null), null);
	});
	it('a paid event without a currency is rejected with a plain message', async () => {
		await assert.rejects(() => currencyService().resolveEventCurrency(20, ''), /Choose a currency/);
	});
});

describe('TicketService.createTicket', () => {
	const build = (event: Record<string, unknown>, points: number, docs: Doc[] = CURRENCIES) => {
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
			currencyService(docs),
		);
		return { service, created, edits };
	};
	const base = { attendeeCount: 0, eventCapacity: 100, memberId: 'org' };

	it('sells a free event that has no currency, even when no currency exists at all', async () => {
		const { service, created } = build({ ...base, eventPrice: 0, eventCurrency: null }, 0, []);
		await service.createTicket('m' as never, { eventId: 'e', ticketQuantity: 1 } as never);
		assert.equal(created.length, 1);
		assert.equal(created[0].totalPrice, 0);
		assert.equal(created[0].ticketCurrency, undefined);
	});

	it('sells a free event whose currency is unknown without any conversion', async () => {
		const { service, created } = build({ ...base, eventPrice: 0, eventCurrency: 'EUR' }, 0);
		await service.createTicket('m' as never, { eventId: 'e', ticketQuantity: 2 } as never);
		assert.equal(created[0].totalPrice, 0);
	});

	it('refuses a paid event with no currency with a clear message', async () => {
		const { service, created } = build({ ...base, eventPrice: 2, eventCurrency: null }, 100);
		await assert.rejects(
			() => service.createTicket('m' as never, { eventId: 'e', ticketQuantity: 1 } as never),
			/has no currency set/,
		);
		assert.equal(created.length, 0);
	});

	it('prices a paid event with its currency', async () => {
		const { service, created } = build({ ...base, eventPrice: 2, eventCurrency: 'USD' }, 100);
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

describe('EventService create and update', () => {
	const build = () => {
		const created: Record<string, unknown>[] = [];
		const updated: Record<string, unknown>[] = [];
		const service = new EventService(
			{
				create: async (e: Record<string, unknown>) => (created.push(e), { _id: 'e1', ...e }),
				findByIdAndUpdate: (_id: unknown, input: Record<string, unknown>) => ({
					exec: async () => (updated.push(input), { _id: 'e1', ...input }),
				}),
			} as never,
			{} as never,
			{ scheduleEventJobs: async () => undefined } as never,
			{} as never,
			{} as never,
			{} as never,
			{ memberStatsEditor: async () => undefined } as never,
			{} as never,
			currencyService(),
		);
		(service as any).handleEventJobsOnUpdate = async () => undefined;
		return { service, created, updated };
	};
	const input = { eventName: 'x', eventCategories: [], eventTags: [] };

	it('creates a free event without a currency and stores none', async () => {
		const { service, created } = build();
		await service.createEvent('m' as never, { ...input, eventPrice: 0 } as never).catch(() => undefined);
		assert.equal(created.length, 1);
		assert.equal('eventCurrency' in created[0] && created[0].eventCurrency, false);
	});

	it('creates a paid event with a chosen currency (normalised)', async () => {
		const { service, created } = build();
		await service
			.createEvent('m' as never, { ...input, eventPrice: 5, eventCurrency: 'krw' } as never)
			.catch(() => undefined);
		assert.equal(created[0]?.eventCurrency, 'KRW');
	});

	it('refuses a paid event without a currency or with an unsupported one', async () => {
		const { service, created } = build();
		await assert.rejects(
			() => service.createEvent('m' as never, { ...input, eventPrice: 5 } as never),
			/Choose a currency/,
		);
		await assert.rejects(
			() => service.createEvent('m' as never, { ...input, eventPrice: 5, eventCurrency: 'EUR' } as never),
			/not supported/,
		);
		assert.equal(created.length, 0);
	});

	it('update: free event stays without currency; making it paid needs one', async () => {
		const { service, updated } = build();
		const free = { _id: 'e1', eventPrice: 0, eventCurrency: null };
		await (service as any).updateEventWithValidation(free, { _id: 'e1', eventName: 'renamed' });
		assert.equal(updated.length, 1);
		await assert.rejects(
			() => (service as any).updateEventWithValidation(free, { _id: 'e1', eventPrice: 9 }),
			/Choose a currency/,
		);
		await (service as any).updateEventWithValidation(free, { _id: 'e1', eventPrice: 9, eventCurrency: 'usd' });
		assert.equal(updated[1].eventCurrency, 'USD');
	});

	it('update: a paid event keeps working when only other fields change', async () => {
		const { service, updated } = build();
		await (service as any).updateEventWithValidation(
			{ _id: 'e1', eventPrice: 5, eventCurrency: 'USD' },
			{ _id: 'e1', eventName: 'renamed' },
		);
		assert.equal(updated.length, 1);
	});
});
