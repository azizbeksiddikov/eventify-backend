import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BatchService } from '../apps/batch/src/batch.service';
import { LLMChatService } from '../apps/api/src/components/llm/llm-chat.service';
import { LLMService as BatchLLMService } from '../apps/batch/src/components/llm/llm.service';

const originalWebCrawlingEnabled = process.env.WEB_CRAWLING_ENABLED;

afterEach(() => {
	if (originalWebCrawlingEnabled === undefined) delete process.env.WEB_CRAWLING_ENABLED;
	else process.env.WEB_CRAWLING_ENABLED = originalWebCrawlingEnabled;
});

describe('BatchService web crawling', () => {
	it('skips the crawling job when WEB_CRAWLING_ENABLED is false', async () => {
		process.env.WEB_CRAWLING_ENABLED = 'false';
		let crawlCalls = 0;
		const service = new BatchService(
			{ generateRecurringEvents: async () => undefined } as never,
			{
				getEventCrawling: async () => {
					crawlCalls += 1;
				},
			} as never,
			{ batchRollback: async () => undefined, batchTopOrganizers: async () => undefined } as never,
			{ cleanupEventStatuses: async () => undefined } as never,
		);

		await service.handleWebCrawling();

		assert.equal(crawlCalls, 0);
	});

	it('requires an explicit true value before starting the crawling job', async () => {
		delete process.env.WEB_CRAWLING_ENABLED;
		let crawlCalls = 0;
		const service = new BatchService(
			{ generateRecurringEvents: async () => undefined } as never,
			{
				getEventCrawling: async () => {
					crawlCalls += 1;
				},
			} as never,
			{ batchRollback: async () => undefined, batchTopOrganizers: async () => undefined } as never,
			{ cleanupEventStatuses: async () => undefined } as never,
		);

		await service.handleWebCrawling();

		assert.equal(crawlCalls, 0);
	});
});

describe('LLMChatService without Gemini', () => {
	it('reports that AI features are disabled instead of throwing during startup', async () => {
		delete process.env.GEMINI_API_KEY;

		const service = new LLMChatService();

		const result = await service.checkConnection();
		assert.deepEqual(result, {
			success: false,
			message: 'Gemini AI is not configured',
			baseUrl: 'Gemini API',
			configuredModel: 'gemini-2.5-flash',
			hint: 'Set GEMINI_API_KEY to enable AI features',
			modelReady: false,
		});
	});
});

describe('Batch LLM service without Gemini', () => {
	it('passes crawled events through without starting Gemini requests', async () => {
		delete process.env.GEMINI_API_KEY;
		const events = [{ eventName: 'Free event' }] as never[];

		const service = new BatchLLMService();
		const result = await service.filterAndCompleteEvents(events);

		assert.deepEqual(result.accepted, events);
		assert.deepEqual(result.rejected, []);
		assert.equal(result.reasons.size, 0);
	});
});
