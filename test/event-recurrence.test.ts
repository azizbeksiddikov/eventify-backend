import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { EventRecurrenceService } from '../apps/batch/src/components/eventRecurrence/eventRecurrence.service';

const DAY = 24 * 60 * 60 * 1000;

type Doc = Record<string, any>;

/** The service with fake models: `latest` is the newest event already generated for the template, if any. */
const makeService = (recurrence: Doc, latest?: Doc) => {
	const created: Doc[] = [];
	const recurrenceModel = { find: () => ({ exec: async () => [recurrence] }) };
	const eventModel = {
		findOne: (query: Doc) => {
			const chain = {
				sort: () => chain,
				exec: async () => {
					// "does this exact event exist?" check
					if (query.eventStartAt)
						return created.find((e) => e.eventStartAt.getTime() === query.eventStartAt.getTime()) || null;
					// "newest generated event" lookup
					return latest || null;
				},
			};
			return chain;
		},
		create: async (doc: Doc) => {
			created.push(doc);
			return { ...doc, _id: String(created.length) };
		},
	};
	const agendaService = { getAgenda: () => ({ schedule: async () => undefined }) };
	const service = new EventRecurrenceService(recurrenceModel as never, eventModel as never, agendaService as never);
	return { service, created };
};

const at = (daysFromNow: number, hours = 10, minutes = 0) => {
	const d = new Date(Date.now() + daysFromNow * DAY);
	d.setHours(hours, minutes, 0, 0);
	return d;
};

const base = (extra: Doc): Doc => ({
	_id: 'rec1',
	isActive: true,
	recurrenceEndDate: null,
	eventName: 'Test series',
	eventStartAt: at(-100),
	eventEndAt: new Date(at(-100).getTime() + 2 * 60 * 60 * 1000),
	...extra,
});

describe('EventRecurrenceService', () => {
	it('INTERVAL: continues one interval after the newest event, on the same weekday', async () => {
		const latest = { eventStartAt: at(5) };
		const { service, created } = makeService(
			base({ recurrenceType: 'INTERVAL', recurrenceInterval: 14, recurrenceDaysOfWeek: [] }),
			latest,
		);
		await service.generateRecurringEvents();
		assert.equal(created.length, 1);
		assert.equal(created[0].eventStartAt.getTime(), at(19).getTime());
		assert.equal(created[0].eventStartAt.getDay(), latest.eventStartAt.getDay());
	});

	it('INTERVAL: an empty weekday list does not block the first batch', async () => {
		const { service, created } = makeService(
			base({
				recurrenceType: 'INTERVAL',
				recurrenceInterval: 7,
				recurrenceDaysOfWeek: [],
				eventStartAt: at(-1),
				eventEndAt: at(-1),
			}),
		);
		await service.generateRecurringEvents();
		assert.ok(created.length >= 3, `expected a month of weekly events, got ${created.length}`);
		for (let i = 1; i < created.length; i++) {
			assert.equal(created[i].eventStartAt.getTime() - created[i - 1].eventStartAt.getTime(), 7 * DAY);
		}
	});

	it('DAYS_OF_WEEK: only the listed days, starting the day after the template date', async () => {
		const { service, created } = makeService(
			base({ recurrenceType: 'DAYS_OF_WEEK', recurrenceDaysOfWeek: [2, 4], eventStartAt: at(0), eventEndAt: at(0) }),
		);
		await service.generateRecurringEvents();
		assert.ok(created.length >= 8);
		for (const e of created) assert.ok([2, 4].includes(e.eventStartAt.getDay()));
		assert.ok(created.every((e) => e.eventStartAt.getTime() > Date.now()));
	});

	it('does nothing when the template has ended', async () => {
		const { service, created } = makeService(
			base({ recurrenceType: 'DAYS_OF_WEEK', recurrenceDaysOfWeek: [1], recurrenceEndDate: at(-3) }),
		);
		await service.generateRecurringEvents();
		assert.equal(created.length, 0);
	});

	it('does not create the same event twice', async () => {
		const { service, created } = makeService(
			base({ recurrenceType: 'DAYS_OF_WEEK', recurrenceDaysOfWeek: [1], eventStartAt: at(0), eventEndAt: at(0) }),
		);
		await service.generateRecurringEvents();
		const first = created.length;
		await service.generateRecurringEvents();
		assert.equal(created.length, first);
	});
});
