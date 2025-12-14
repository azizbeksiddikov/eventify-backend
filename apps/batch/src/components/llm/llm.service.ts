import { Injectable } from '@nestjs/common';
import { CrawledEvent } from '@app/api/src/libs/dto/event/eventCrawling';
import { EventCategory } from '@app/api/src/libs/enums/event.enum';
import { LLM_DEFAULTS, LLM_PROMPTS } from '../../libs/constants/llm.constants';
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

				if (safetyCheck.isSafe) safeEvents.push(event);
				else {
					rejected.push(event);
					reasons.set(event.externalId || event.eventName, safetyCheck.reason);
				}
			} catch (error) {
				console.warn(`Safety check error for "${event.eventName}": ${error.message}`);
				safeEvents.push(event);
			}
			////////////////////////////////////////////////////////////
			// Step 2: Enrich Events based on raw data
			////////////////////////////////////////////////////////////
		}

		console.log(`✅ AI filtering complete: ${safeEvents.length} accepted, ${rejected.length} rejected`);
		return { accepted: safeEvents, rejected, reasons };
	}

	////////////////////////////////////////////////////////////
	// Helper Functions
	////////////////////////////////////////////////////////////

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
						num_predict: 50,
					},
				}),
			});

			if (!response.ok) throw new Error(`Ollama API error: ${response.statusText}`);

			const data = await response.json();
			const aiResponse = data.response;

			// LOG OUTPUT
			console.log(`\n${'='.repeat(80)}`);
			console.log(`🤖 AI OUTPUT for: "${event.eventName}"`);
			console.log(`${'='.repeat(80)}`);
			console.log(aiResponse);
			console.log(`${'='.repeat(80)}\n`);

			return { isSafe: aiResponse.safe, reason: aiResponse.reason || 'Safe' };
		} catch (error) {
			console.error(`Ollama error: ${error.message}`);
			return { isSafe: true, reason: 'LLM unavailable - accepting' };
		}
	}

	private async categorizeSingleEvent(event: CrawledEvent): Promise<EventCategory[]> {
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
						temperature: LLM_DEFAULTS.TEMPERATURE,
						num_predict: LLM_DEFAULTS.MAX_TOKENS_CATEGORIZE,
					},
				}),
			});

			if (!response.ok) {
				throw new Error(`Ollama API error: ${response.statusText}`);
			}

			const data = await response.json();
			const categories = this.parseCategorizeResponse(data.response);

			return categories;
		} catch (error) {
			console.error(`Ollama error: ${error.message}`);
			return [EventCategory.OTHER];
		}
	}

	/**
	 * Parse categorization response from LLM
	 * Extracts categories and validates against EventCategory enum
	 * @param response Raw text response from LLM
	 * @returns Array of valid EventCategory values
	 */
	private parseCategorizeResponse(response: string): EventCategory[] {
		try {
			// Try to extract JSON array
			const jsonMatch = response.match(/\[[\s\S]*?\]/);
			if (jsonMatch) {
				const parsed = JSON.parse(jsonMatch[0]);
				const validCategories = parsed.filter((cat: string) =>
					Object.values(EventCategory).includes(cat as EventCategory),
				);
				return validCategories.length > 0 ? validCategories : [EventCategory.OTHER];
			}

			// Fallback: look for category names in text
			const found: EventCategory[] = [];
			const upper = response.toUpperCase();

			for (const category of Object.values(EventCategory)) {
				if (upper.includes(category)) {
					found.push(category);
					if (found.length >= 2) break;
				}
			}

			return found.length > 0 ? found : [EventCategory.OTHER];
		} catch (error) {
			return [EventCategory.OTHER];
		}
	}

	/**
	 * Health check - verify Ollama is running
	 */
	async healthCheck(): Promise<{ status: string; model: string; available: boolean }> {
		if (!this.llmEnabled) {
			return { status: 'disabled', model: this.ollamaModel, available: false };
		}

		try {
			const response = await fetch(`${this.ollamaBaseUrl}/api/tags`, {
				method: 'GET',
			});

			if (!response.ok) {
				return { status: 'error', model: this.ollamaModel, available: false };
			}

			const data = await response.json();
			const modelExists = data.models?.some((m: any) => m.name.includes(this.ollamaModel.split(':')[0]));

			return {
				status: modelExists ? 'ready' : 'model_not_found',
				model: this.ollamaModel,
				available: modelExists,
			};
		} catch (error) {
			return { status: 'offline', model: this.ollamaModel, available: false };
		}
	}
}
