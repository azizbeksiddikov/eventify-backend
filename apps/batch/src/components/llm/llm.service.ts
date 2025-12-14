import { Injectable } from '@nestjs/common';
import { CrawledEvent } from '@app/api/src/libs/dto/event/eventCrawling';
import { LLM_DEFAULTS } from '../../libs/constants/llm.constants';
import { buildSafetyCheckPrompt, fillEventDataPrompt } from '../../libs/constants/llm.prompts';

@Injectable()
export class LLMService {
	private readonly llmEnabled: boolean;
	private readonly ollamaModel: string;
	private readonly ollamaBaseUrl: string;

	constructor() {
		this.llmEnabled = process.env.LLM_ENABLED === 'true';

		const ollamaModel = process.env.OLLAMA_MODEL;
		const ollamaBaseUrl = process.env.OLLAMA_BASE_URL;
		if (!ollamaModel || !ollamaBaseUrl) throw new Error('OLLAMA_MODEL and OLLAMA_BASE_URL must be set');

		this.ollamaModel = ollamaModel;
		this.ollamaBaseUrl = ollamaBaseUrl;

		if (this.llmEnabled) {
			console.log(`🤖 LLM enabled: ${this.ollamaModel} at ${this.ollamaBaseUrl}`);
		} else {
			console.warn('⚠️  LLM is disabled. Set LLM_ENABLED=true to enable AI filtering.');
		}
	}

	async filterAndCompleteEvents(events: CrawledEvent[]): Promise<{
		accepted: CrawledEvent[];
		rejected: CrawledEvent[];
		reasons: Map<string, string>;
	}> {
		if (!this.llmEnabled) return { accepted: events, rejected: [], reasons: new Map() };

		console.log(`Processing ${events.length} events with AI safety filter...`);

		const safeEvents: CrawledEvent[] = [];
		const rejected: CrawledEvent[] = [];
		const reasons = new Map<string, string>();

		// for each crawled event
		for (let i = 0; i < events.length; i++) {
			const event = events[i];
			console.log(`Processing event ${i + 1}/${events.length} \n`);

			////////////////////////////////////////////////////////////
			// Step 1: Filter Events for sexual content and drugs
			////////////////////////////////////////////////////////////
			try {
				// Check for safety issues (sexual/drug content)
				const safetyCheck = await this.checkEventSafety(event);

				if (!safetyCheck.isSafe) {
					rejected.push(event);
					reasons.set(event.externalId || event.eventName, safetyCheck.reason);
					continue; // Skip to next event
				}

				////////////////////////////////////////////////////////////
				// Step 2: Fill missing data based on raw data
				////////////////////////////////////////////////////////////
				console.log(`🔍 Filling missing data for: "${event.eventName}"`);
				const completedEvent = await this.fillMissingEventData(event);
				safeEvents.push(completedEvent);
			} catch (error) {
				console.warn(`Processing error for "${event.eventName}": ${error.message}`);
				safeEvents.push(event); // Accept event with original data on error
			}
		}

		console.log(`✅ AI filtering complete: ${safeEvents.length} accepted, ${rejected.length} rejected`);
		return { accepted: safeEvents, rejected, reasons };
	}

	////////////////////////////////////////////////////////////
	// Helper Functions
	////////////////////////////////////////////////////////////

	private async fillMissingEventData(event: CrawledEvent): Promise<CrawledEvent> {
		// Check if event needs completion (missing categories or tags)
		const needsCategories = !event.eventCategories || event.eventCategories.length === 0;
		const needsTags = !event.eventTags || event.eventTags.length === 0;

		if (!needsCategories && !needsTags) {
			console.log(`   ✓ Event already has categories and tags, skipping LLM completion`);
			return event;
		}

		const prompt = fillEventDataPrompt(event);

		try {
			const response = await fetch(`${this.ollamaBaseUrl}/api/generate`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					model: this.ollamaModel,
					prompt: prompt,
					stream: false,
					options: {
						temperature: 0.3, // Slightly creative for categorization
						num_predict: 700, // Categories + tags with raw_html + structured data
					},
				}),
			});

			if (!response.ok) throw new Error(`Ollama API error: ${response.statusText}`);

			const data = await response.json();
			const aiResponse = data.response;

			// LOG AI RESPONSE for debugging
			console.log(`\n${'='.repeat(80)}`);
			console.log(`📝 DATA COMPLETION for: "${event.eventName}"`);
			console.log(`${'='.repeat(80)}`);
			console.log(aiResponse.substring(0, 500) + (aiResponse.length > 500 ? '...' : ''));
			console.log(`${'='.repeat(80)}\n`);

			// Try to extract JSON from response
			let parsedData;
			try {
				// Try parsing the entire response first (if it's pure JSON)
				parsedData = JSON.parse(aiResponse.trim());
			} catch {
				// If that fails, try multiple extraction patterns
				let jsonStr: string | null = null;

				// Pattern 1: JSON in markdown code block
				let match = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
				if (match) jsonStr = match[1];

				// Pattern 2: JSON in plain code block
				if (!jsonStr) {
					match = aiResponse.match(/```\s*(\{[\s\S]*?\})\s*```/);
					if (match) jsonStr = match[1];
				}

				// Pattern 3: Any JSON object in the response
				if (!jsonStr) {
					match = aiResponse.match(/(\{[\s\S]*\})/);
					if (match) jsonStr = match[0];
				}

				// Pattern 4: Extract from first { to last } (most lenient)
				if (!jsonStr) {
					const firstBrace = aiResponse.indexOf('{');
					const lastBrace = aiResponse.lastIndexOf('}');
					if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
						jsonStr = aiResponse.substring(firstBrace, lastBrace + 1);
					}
				}

				if (jsonStr) {
					try {
						parsedData = JSON.parse(jsonStr.trim());
					} catch (e) {
						console.error('Failed to parse extracted JSON:', jsonStr.substring(0, 200));
						throw new Error(`JSON parse error: ${e.message}`);
					}
				} else {
					console.error('No JSON pattern found in response');
					throw new Error('Could not extract JSON from AI response');
				}
			}

			const completedEvent: CrawledEvent = {
				...event,
				eventCategories: parsedData.categories?.length > 0 ? parsedData.categories : event.eventCategories,
				eventTags: parsedData.tags?.length > 0 ? parsedData.tags : event.eventTags,
			};

			console.log(
				`   ✅ Completed: categories=${completedEvent.eventCategories?.join(', ')}, tags=${completedEvent.eventTags?.slice(0, 3).join(', ')}...`,
			);

			return completedEvent;
		} catch (error) {
			console.warn(`   ⚠️  Failed to complete event data: ${error.message}`);
			// Return original event on error
			return event;
		}
	}

	private async checkEventSafety(event: CrawledEvent): Promise<{ isSafe: boolean; reason: string }> {
		const prompt = buildSafetyCheckPrompt(event);

		try {
			const response = await fetch(`${this.ollamaBaseUrl}/api/generate`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					model: this.ollamaModel,
					prompt: prompt,
					stream: false,
					options: {
						temperature: 0.1, // Very consistent for safety checks
						num_predict: LLM_DEFAULTS.MAX_TOKENS_FILTER,
					},
				}),
			});

			if (!response.ok) throw new Error(`Ollama API error: ${response.statusText}`);
			const data = await response.json();
			const aiResponse = data.response;

			// Extract JSON from response (it may contain additional text)
			const jsonMatch = aiResponse.match(/```json\s*(\{[\s\S]*?\})\s*```/);
			if (!jsonMatch) {
				console.warn('Could not extract JSON from AI response, accepting event by default');
				return { isSafe: true, reason: 'JSON parsing failed' };
			}

			const parsedResponse = JSON.parse(jsonMatch[1]);
			return { isSafe: parsedResponse.safe, reason: parsedResponse.reason || 'Safe' };
		} catch (error) {
			console.error(`Ollama error: ${error.message}`);
			return { isSafe: true, reason: 'LLM unavailable - accepting' };
		}
	}
}
