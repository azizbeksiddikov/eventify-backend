import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MeetupScraper } from '../apps/batch/src/components/webCrawling/scrapers/meetup.scraper';

// extractLocation is private; the tests reach it on purpose because it is where the online/offline decision is made.
const locate = (event: Record<string, unknown>) =>
	(
		new MeetupScraper() as unknown as {
			extractLocation: (e: unknown) => { type: string; city?: string; address?: string };
		}
	).extractLocation(event);

describe('MeetupScraper location', () => {
	it('an ONLINE event is online and has no city', () => {
		const r = locate({ eventType: 'ONLINE', venue: { name: 'Online event', city: 'Somewhere' } });
		assert.equal(r.type, 'ONLINE');
		assert.equal(r.city, undefined);
	});

	it('VIRTUAL and isOnline events are online too', () => {
		assert.equal(locate({ eventType: 'VIRTUAL' }).type, 'ONLINE');
		assert.equal(locate({ isOnline: true }).type, 'ONLINE');
	});

	it('a PHYSICAL event is offline and keeps its city and address', () => {
		const r = locate({ eventType: 'PHYSICAL', venue: { name: 'Cafe', address: '1 Main St', city: 'Seoul' } });
		assert.equal(r.type, 'OFFLINE');
		assert.equal(r.city, 'Seoul');
		assert.equal(r.address, '1 Main St');
	});

	it('an event with an unknown type is offline, not online', () => {
		assert.equal(locate({ venue: { city: 'Seoul' } }).type, 'OFFLINE');
	});
});
