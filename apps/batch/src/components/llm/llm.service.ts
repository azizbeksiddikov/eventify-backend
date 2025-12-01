import { Injectable, Logger } from '@nestjs/common';
import { CrawledEvent } from '@app/api/src/libs/dto/event/eventCrawling';
import { EventCategory } from '@app/api/src/libs/enums/event.enum';
import { LLM_DEFAULTS, LLM_PROMPTS } from '../../libs/constants/llm.constants';

/**
 * LLM Service for AI-powered event filtering and categorization
 *
 * Features:
 * - Quality filtering: Accepts legitimate events, rejects spam/scams
 * - Smart categorization: Assigns relevant categories based on content
 * - Lightweight: Uses Qwen2.5 0.5B (500M params, ~400MB RAM)
 * - Fail-safe: If LLM unavailable, accepts all events (fail-open)
 *
 * @remarks
 * Designed for 2GB RAM VPS with Korean language support
 */
@Injectable()
export class LLMService {
	private readonly logger = new Logger(LLMService.name);
	private readonly llmEnabled: boolean;
	private readonly ollamaModel: string;
	private readonly ollamaBaseUrl: string;

	constructor() {
		this.llmEnabled = process.env.LLM_ENABLED === 'true';
		this.ollamaModel = process.env.OLLAMA_MODEL || LLM_DEFAULTS.MODEL;
		this.ollamaBaseUrl = process.env.OLLAMA_BASE_URL || LLM_DEFAULTS.BASE_URL;

		if (this.llmEnabled) {
			this.logger.log(`🤖 LLM enabled: ${this.ollamaModel} at ${this.ollamaBaseUrl}`);
			this.logger.log(`💾 Estimated RAM usage: ~400MB`);
		} else {
			this.logger.warn('⚠️  LLM is disabled. Set LLM_ENABLED=true to enable AI filtering.');
		}
	}

	/**
	 * Enrich and validate events with minimal safety filtering
	 *
	 * ACCEPTS almost everything:
	 * - Professional events, meetups, networking
	 * - Social gatherings, parties, dining
	 * - Language exchanges, education
	 * - Sports, fitness, outdoor
	 * - Music, concerts, entertainment
	 * - Events with alcohol (bars, clubs) ✅
	 * - All community events
	 *
	 * REJECTS only:
	 * - Sexual/adult content ❌
	 * - Drug-related events ❌
	 */
	async filterEvents(events: CrawledEvent[]): Promise<{
		accepted: CrawledEvent[];
		rejected: CrawledEvent[];
		reasons: Map<string, string>;
	}> {
		if (!this.llmEnabled) {
			this.logger.log('LLM disabled - accepting all events as-is');
			return { accepted: events, rejected: [], reasons: new Map() };
		}

		this.logger.log(`\n${'🔍'.repeat(40)}`);
		this.logger.log(`🔍 Processing ${events.length} events with AI (minimal safety filter)...`);
		this.logger.log(`${'🔍'.repeat(40)}\n`);

		const accepted: CrawledEvent[] = [];
		const rejected: CrawledEvent[] = [];
		const reasons = new Map<string, string>();

		for (let i = 0; i < events.length; i++) {
			const event = events[i];
			this.logger.log(`\n>>> Processing event ${i + 1}/${events.length} <<<\n`);
			try {
				// Check for safety issues (sexual/drug content)
				const safetyCheck = await this.checkEventSafety(event);

				if (safetyCheck.isSafe) {
					accepted.push(event);
				} else {
					rejected.push(event);
					reasons.set(event.eventUrl || event.eventName, safetyCheck.reason);
				}
			} catch (error) {
				this.logger.warn(`Safety check error for "${event.eventName}": ${error.message}`);
				// On error, accept by default (fail-open)
				accepted.push(event);
			}
		}

		this.logger.log(`✅ Processed: ${accepted.length} accepted, ${rejected.length} rejected (safety only)`);

		return {
			accepted,
			rejected,
			reasons,
		};
	}

	/**
	 * Categorize AND enrich events using lightweight LLM
	 * Assigns relevant EventCategory values and fixes data issues
	 */
	async categorizeEvents(events: CrawledEvent[]): Promise<Map<string, EventCategory[]>> {
		if (!this.llmEnabled) {
			this.logger.log('LLM disabled - using default categorization');
			return new Map();
		}

		const categoriesMap = new Map<string, EventCategory[]>();
		this.logger.log(`🏷️  Categorizing & enriching ${events.length} events with AI...`);

		for (const event of events) {
			try {
				const categories = await this.categorizeSingleEvent(event);
				categoriesMap.set(event.eventUrl || event.eventName, categories);
			} catch (error) {
				this.logger.warn(`Categorization error for "${event.eventName}": ${error.message}`);
				categoriesMap.set(event.eventUrl || event.eventName, [EventCategory.OTHER]);
			}
		}

		this.logger.log(`✅ Categorization & enrichment complete`);
		return categoriesMap;
	}

	/**
	 * Check event safety - only filters sexual/drug content
	 * @param event Event to check
	 * @returns Safety status
	 */
	private async checkEventSafety(event: CrawledEvent): Promise<{ isSafe: boolean; reason: string }> {
		// Skip check for empty events (they'll be filtered later)
		if (!event.eventName || event.eventName === 'Untitled Event') {
			this.logger.warn(`❌ Filtering out: "${event.eventName}" - Empty/untitled event`);
			return { isSafe: false, reason: 'Empty or untitled event' };
		}

		const prompt = this.buildSafetyCheckPrompt(event);

		// LOG INPUT
		this.logger.log(`\n${'='.repeat(80)}`);
		this.logger.log(`🔍 AI INPUT for: "${event.eventName}"`);
		this.logger.log(`${'='.repeat(80)}`);
		this.logger.log(prompt);
		this.logger.log(`${'='.repeat(80)}\n`);

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

			if (!response.ok) {
				throw new Error(`Ollama API error: ${response.statusText}`);
			}

			const data = await response.json();
			const aiResponse = data.response;

			// LOG OUTPUT
			this.logger.log(`\n${'='.repeat(80)}`);
			this.logger.log(`🤖 AI OUTPUT for: "${event.eventName}"`);
			this.logger.log(`${'='.repeat(80)}`);
			this.logger.log(aiResponse);
			this.logger.log(`${'='.repeat(80)}\n`);

			const result = this.parseSafetyResponse(aiResponse);

			// LOG DECISION
			if (result.isSafe) {
				this.logger.log(`✅ ACCEPTED: "${event.eventName}" - ${result.reason}`);
			} else {
				this.logger.warn(`❌ REJECTED: "${event.eventName}" - ${result.reason}`);
			}

			return result;
		} catch (error) {
			this.logger.error(`Ollama error: ${error.message}`);
			return { isSafe: true, reason: 'LLM unavailable - accepting' }; // Fail-open
		}
	}

	/**
	 * Categorize a single event using Ollama API
	 * @param event Event to categorize
	 * @returns Array of relevant EventCategory values
	 */
	private async categorizeSingleEvent(event: CrawledEvent): Promise<EventCategory[]> {
		const prompt = this.buildCategorizePrompt(event);

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
			this.logger.error(`Ollama error: ${error.message}`);
			return [EventCategory.OTHER];
		}
	}

	/**
	 * Build safety check prompt - extremely minimal filtering
	 */
	private buildSafetyCheckPrompt(event: CrawledEvent): string {
		const desc = event.eventDesc?.substring(0, 200) || '';
		const name = event.eventName;

		return `Is this event appropriate for a public event platform?

Event: ${name}
Description: ${desc}

IMPORTANT: ACCEPT almost everything. Only mark as unsafe if EXPLICITLY sexual or drug-related.

Examples of SAFE events (say "safe: true"):
- Bar crawls, drinking parties (alcohol OK)
- Music, concerts, nightlife
- Dating meetups, social gatherings
- Language exchange, networking
- ANY professional or community event

Examples of UNSAFE (say "safe: false"):
- Strip clubs, adult entertainment
- Drug parties, marijuana events

Answer JSON: {"safe": true}  OR  {"safe": false, "reason": "why"}

Default to safe=true unless CLEARLY inappropriate.`;
	}

	/**
	 * Build categorization prompt optimized for small models
	 * Assigns 1-2 most relevant categories
	 */
	private buildCategorizePrompt(event: CrawledEvent): string {
		const desc = event.eventDesc?.substring(0, LLM_PROMPTS.CATEGORIZATION_DESC_LENGTH) || 'No description';
		const tags = event.rawData?.tags?.slice(0, LLM_PROMPTS.CATEGORIZATION_TAGS_COUNT).join(', ') || 'None';

		return `Task: Assign 1-2 most relevant categories.

AVAILABLE CATEGORIES:
- TECHNOLOGY: coding, AI, tech, software, startups, blockchain
- BUSINESS: entrepreneurship, marketing, sales, networking, career
- SOCIAL: meetups, parties, networking, friends, community
- SPORTS: fitness, yoga, running, hiking, climbing, sports
- ART: music, painting, dance, theater, creative, design
- EDUCATION: workshops, classes, learning, language exchange
- FOOD: dining, cooking, restaurants, culinary
- HEALTH: wellness, mental health, meditation, healthcare
- ENTERTAINMENT: movies, games, concerts, fun activities
- TRAVEL: trips, tourism, exploration
- OTHER: anything that doesn't fit above

Event: ${event.eventName}
Description: ${desc}
Tags: ${tags}

Examples:
- "Seoul AI Meetup" → ["TECHNOLOGY", "SOCIAL"]
- "Korean Language Exchange" → ["EDUCATION", "SOCIAL"]
- "Startup Networking Night" → ["BUSINESS", "SOCIAL"]
- "Yoga Class" → ["SPORTS", "HEALTH"]
- "Movie Night" → ["ENTERTAINMENT", "SOCIAL"]

Answer with JSON array only:
["CATEGORY1"] or ["CATEGORY1", "CATEGORY2"]`;
	}

	/**
	 * Parse safety check response from LLM
	 * DEFAULT TO SAFE - only reject if explicitly unsafe
	 * @param response Raw text response from LLM
	 * @returns Safety status
	 */
	private parseSafetyResponse(response: string): { isSafe: boolean; reason: string } {
		try {
			this.logger.debug(`AI safety response: ${response.substring(0, 100)}`);

			// Try to extract JSON from response
			const jsonMatch = response.match(/\{[\s\S]*?\}/);
			if (jsonMatch) {
				const parsed = JSON.parse(jsonMatch[0]);

				// Check if explicitly marked as unsafe
				if (parsed.safe === false || parsed.safe === 'false') {
					return {
						isSafe: false,
						reason: parsed.reason || 'Inappropriate content',
					};
				}

				// Everything else is safe (default to accept)
				return { isSafe: true, reason: 'Safe' };
			}

			// Fallback: look for REJECT keywords (only reject if explicit)
			const lower = response.toLowerCase();
			if (lower.includes('unsafe') || lower.includes('reject') || lower.includes('adult') || lower.includes('drug')) {
				return { isSafe: false, reason: 'Flagged as inappropriate' };
			}

			// DEFAULT: ACCEPT everything else
			return { isSafe: true, reason: 'Safe (default)' };
		} catch (error) {
			// On error, ACCEPT (fail-open)
			return { isSafe: true, reason: 'Parse error - accepted' };
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
