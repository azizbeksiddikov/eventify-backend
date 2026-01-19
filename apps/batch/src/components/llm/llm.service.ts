import { Injectable } from '@nestjs/common';
import { CrawledEvent } from '@app/api/src/libs/dto/event/eventCrawling';
import { buildSafetyCheckPrompt, fillEventDataPrompt } from '../../libs/constants/llm.prompts';
import { EventCategory } from '@app/api/src/libs/enums/event.enum';

interface OllamaResponse {
	response: string;
}

interface EventCategorizationResponse {
	categories?: string[] | string;
	tags?: string[] | string;
}

interface SafetyCheckResponse {
	safe: boolean;
	reason: string;
}

@Injectable()
export class LLMService {
	private readonly llmEnabled: boolean;
	private readonly ollamaModel: string;
	private readonly ollamaBaseUrl: string;

	constructor() {
		this.llmEnabled = true;

		const ollamaModel = process.env.OLLAMA_MODEL;
		const ollamaBaseUrl = process.env.OLLAMA_BASE_URL;
		if (!ollamaModel || !ollamaBaseUrl) throw new Error('OLLAMA_MODEL and OLLAMA_BASE_URL must be set');

		this.ollamaModel = ollamaModel;
		this.ollamaBaseUrl = ollamaBaseUrl;

		if (this.llmEnabled) {
			console.log(`LLM enabled: ${this.ollamaModel} at ${this.ollamaBaseUrl}`);
		} else {
			console.warn('LLM is disabled.');
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

		// Process events sequentially with delay to prevent CPU overload
		for (let i = 0; i < events.length; i++) {
			const event = events[i];
			console.log(`Processing event ${i + 1}/${events.length}`);

			////////////////////////////////////////////////////////////
			// Step 1: Filter Events for sexual content and drugs
			////////////////////////////////////////////////////////////
			try {
				const safetyCheck = await this.checkEventSafety(event);

				if (!safetyCheck.isSafe) {
					rejected.push(event);
					reasons.set(event.externalId || event.eventName, safetyCheck.reason);
					continue;
				}

				////////////////////////////////////////////////////////////
				// Step 2: Fill missing event data
				////////////////////////////////////////////////////////////
				// Add 3 second delay between requests to reduce CPU usage and allow memory cleanup
				await new Promise((resolve) => setTimeout(resolve, 3000));

				// Fill missing data
				const completedEvent = await this.fillMissingEventData(event);
				safeEvents.push(completedEvent);

				// Add another delay after completion to allow memory cleanup
				await new Promise((resolve) => setTimeout(resolve, 2000));
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				console.warn(`Processing error for "${event.eventName}": ${errorMessage}`);
				safeEvents.push(event);
			}
		}

		console.log(`AI filtering complete: ${safeEvents.length} accepted, ${rejected.length} rejected`);
		return { accepted: safeEvents, rejected, reasons };
	}

	async fillMissingEventData(event: CrawledEvent): Promise<CrawledEvent> {
		// Check if event needs completion (missing categories or tags)
		const needsCategories = !event.eventCategories || event.eventCategories.length === 0;
		const needsTags = !event.eventTags || event.eventTags.length === 0;

		if (!needsCategories && !needsTags) {
			return event;
		}

		const prompt = fillEventDataPrompt(event);

		try {
			const response = await fetch(`${this.ollamaBaseUrl}/api/generate`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					model: this.ollamaModel, // Model name (e.g., "llama3")
					prompt: prompt,
					stream: false, // Return complete response (no streaming)
					keep_alive: '5m', // Keep model in memory for 5 minutes (will auto-unload after)
					options: {
						temperature: 0.05, // Low = more deterministic output (maintains accuracy)
						num_predict: 1000,
						num_ctx: 8192,
						num_thread: 1, // CPU threads for inference
					},
				}),
			});

			if (!response.ok) {
				const errorText = await response.text();
				console.error(`ERROR: Ollama API error (${response.status}): ${response.statusText}`);
				console.error(`   Response body: ${errorText.substring(0, 200)}`);
				throw new Error(`Ollama API error: ${response.statusText}`);
			}

			const data = (await response.json()) as OllamaResponse;
			const aiResponse = data.response;

			// Try to extract JSON from response
			let parsedData: EventCategorizationResponse;
			try {
				parsedData = JSON.parse(aiResponse.trim()) as EventCategorizationResponse;
			} catch {
				// Try multiple extraction patterns
				let jsonStr: string | null = null;

				// Pattern 1: JSON in markdown code block
				let match = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
				if (match) jsonStr = match[1];

				// Pattern 2: JSON in plain code block
				if (!jsonStr) {
					match = aiResponse.match(/```\s*(\{[\s\S]*?\})\s*```/);
					if (match) jsonStr = match[1];
				}

				// Pattern 3: Any JSON object
				if (!jsonStr) {
					match = aiResponse.match(/(\{[\s\S]*\})/);
					if (match) jsonStr = match[0];
				}

				// Pattern 4: First { to last }
				if (!jsonStr) {
					const firstBrace = aiResponse.indexOf('{');
					const lastBrace = aiResponse.lastIndexOf('}');
					if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
						jsonStr = aiResponse.substring(firstBrace, lastBrace + 1);
					}
				}

				if (jsonStr) {
					try {
						parsedData = JSON.parse(jsonStr.trim()) as EventCategorizationResponse;
					} catch (e) {
						const error = e as Error;
						throw new Error(`JSON parse error: ${error.message}`);
					}
				} else {
					throw new Error('Could not extract JSON from AI response');
				}
			}

			// Normalize categories: convert string to array if needed
			let categories: string[] = [];
			if (typeof parsedData.categories === 'string') {
				categories = parsedData.categories.split(',').map((c) => c.trim());
			} else if (Array.isArray(parsedData.categories)) {
				categories = parsedData.categories;
			}

			// Normalize tags: convert string to array if needed
			let tags: string[] = [];
			if (typeof parsedData.tags === 'string') {
				tags = parsedData.tags.split(',').map((t) => t.trim());
			} else if (Array.isArray(parsedData.tags)) {
				tags = parsedData.tags;
			}

			// Validate and sanitize categories
			const sanitizedCategories = this.validateAndSanitizeCategories(categories);

			// Merge original tags with LLM tags
			const originalTags = event.eventTags || [];
			const llmTags = tags && tags.length > 0 ? this.sanitizeTags(tags) : [];

			const mergedTags = [...originalTags];
			for (const llmTag of llmTags) {
				const tagExists = mergedTags.some((existingTag) => existingTag.toLowerCase() === llmTag.toLowerCase());
				if (!tagExists) {
					mergedTags.push(llmTag);
				}
			}

			const sanitizedTags = mergedTags.length > 0 ? mergedTags : originalTags;

			return {
				...event,
				eventCategories: sanitizedCategories,
				eventTags: sanitizedTags,
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error(`LLM ERROR: ${errorMessage}`);
			return event;
		}
	}

	/**
	 * Quick keyword-based pre-filter for obvious violations
	 */
	private quickKeywordCheck(text: string): { isSafe: boolean; reason: string } | null {
		const lowerText = text.toLowerCase();

		// Highly restricted keywords that should almost always be rejected
		const highRiskKeywords = [
			// Sexual services
			{ keyword: 'escort service', reason: 'Escort services' },
			{ keyword: 'prostitution', reason: 'Prostitution' },
			{ keyword: 'sexual service', reason: 'Sexual services' },
			{ keyword: 'call girl', reason: 'Sexual services' },
			{ keyword: 'massage parlor', reason: 'Suspicious massage services' },
			{ keyword: 'happy ending', reason: 'Sexual services' },
			{ keyword: 'erotic massage', reason: 'Sexual services' },

			// Adult entertainment venues
			{ keyword: 'strip club', reason: 'Adult entertainment venue' },
			{ keyword: "gentlemen's club", reason: 'Adult entertainment venue' },
			{ keyword: 'adult entertainment', reason: 'Adult entertainment' },
			{ keyword: 'peep show', reason: 'Adult entertainment venue' },

			// Illegal drugs
			{ keyword: 'cocaine', reason: 'Illegal drugs' },
			{ keyword: 'heroin', reason: 'Illegal drugs' },
			{ keyword: 'meth dealer', reason: 'Illegal drugs' },
			{ keyword: 'buy meth', reason: 'Illegal drugs' },
			{ keyword: 'methamphetamine', reason: 'Illegal drugs' },
			{ keyword: 'sell drugs', reason: 'Illegal drug sales' },
			{ keyword: 'drug dealer', reason: 'Illegal drug sales' },
			{ keyword: 'buy drugs', reason: 'Illegal drug sales' },
			{ keyword: 'ecstasy party', reason: 'Illegal drugs' },
			{ keyword: 'mdma party', reason: 'Illegal drugs' },
			{ keyword: 'molly party', reason: 'Illegal drugs' },

			// Scams and fraud
			{ keyword: 'pyramid scheme', reason: 'Pyramid scheme' },
			{ keyword: 'ponzi scheme', reason: 'Ponzi scheme' },
			{ keyword: 'get rich quick', reason: 'Scam' },
			{ keyword: 'guaranteed returns', reason: 'Investment scam' },
			{ keyword: 'mlm opportunity', reason: 'MLM scheme' },
			{ keyword: 'multi-level marketing', reason: 'MLM scheme' },

			// Hate groups and extremism
			{ keyword: 'nazi', reason: 'Hate group' },
			{ keyword: 'white supremacy', reason: 'Hate group' },
			{ keyword: 'white power', reason: 'Hate group' },
			{ keyword: 'kkk', reason: 'Hate group' },
			{ keyword: 'hate rally', reason: 'Hate group' },
			{ keyword: 'racial cleansing', reason: 'Extremism' },

			// Violence
			{ keyword: 'bomb making', reason: 'Violence' },
			{ keyword: 'terrorist', reason: 'Terrorism' },
			{ keyword: 'extremist training', reason: 'Extremism' },

			// Illegal weapons
			{ keyword: 'illegal firearms', reason: 'Illegal weapons' },
			{ keyword: 'unregistered gun', reason: 'Illegal weapons' },
			{ keyword: 'black market weapon', reason: 'Illegal weapons' },

			// Child endangerment
			{ keyword: 'child exploitation', reason: 'Child endangerment' },
			{ keyword: 'underage', reason: 'Potential child endangerment' },
		];

		for (const { keyword, reason } of highRiskKeywords) {
			if (lowerText.includes(keyword)) {
				return { isSafe: false, reason };
			}
		}

		return null; // No clear violation, proceed with LLM check
	}

	async checkEventSafety(event: CrawledEvent): Promise<{ isSafe: boolean; reason: string }> {
		// Quick keyword check first
		const combinedText = `${event.eventName || ''} ${event.eventDesc || ''}`;
		const quickCheck = this.quickKeywordCheck(combinedText);
		if (quickCheck !== null) {
			return quickCheck;
		}

		const prompt = buildSafetyCheckPrompt(event);

		try {
			const response = await fetch(`${this.ollamaBaseUrl}/api/generate`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					model: this.ollamaModel,
					prompt: prompt,
					stream: false,
					keep_alive: '10m', // Keep model in memory for 10 minutes (prevent unloading during batch)
					options: {
						temperature: 0.05, // Very low for deterministic safety decisions
						num_predict: 100, // Simpler prompt needs fewer tokens
						num_ctx: 512, // Smaller context for simplified prompt
						num_thread: 1,
					},
				}),
			});

			if (!response.ok) throw new Error(`Ollama API error: ${response.statusText}`);
			const data = (await response.json()) as OllamaResponse;
			const aiResponse = data.response;

			let parsedResponse: SafetyCheckResponse;
			try {
				parsedResponse = JSON.parse(aiResponse.trim()) as SafetyCheckResponse;
			} catch {
				let jsonStr: string | null = null;

				let match = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
				if (match) jsonStr = match[1];

				if (!jsonStr) {
					match = aiResponse.match(/```\s*(\{[\s\S]*?\})\s*```/);
					if (match) jsonStr = match[1];
				}

				if (!jsonStr) {
					match = aiResponse.match(/(\{[\s\S]*\})/);
					if (match) jsonStr = match[0];
				}

				if (!jsonStr) {
					const firstBrace = aiResponse.indexOf('{');
					const lastBrace = aiResponse.lastIndexOf('}');
					if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
						jsonStr = aiResponse.substring(firstBrace, lastBrace + 1);
					}
				}

				if (jsonStr) {
					try {
						parsedResponse = JSON.parse(jsonStr.trim()) as SafetyCheckResponse;
					} catch {
						return { isSafe: true, reason: 'JSON parsing failed' };
					}
				} else {
					return { isSafe: true, reason: 'JSON parsing failed' };
				}
			}

			if (typeof parsedResponse.safe !== 'boolean') {
				return { isSafe: true, reason: 'Invalid LLM response format' };
			}

			return { isSafe: parsedResponse.safe, reason: parsedResponse.reason || '' };
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error(`Ollama error: ${errorMessage}`);
			return { isSafe: true, reason: 'LLM unavailable - accepting' };
		}
	}

	/**
	 * Validate and sanitize categories returned by LLM
	 * Maps common mistakes to valid enum values
	 */
	private validateAndSanitizeCategories(categories: string[]): EventCategory[] {
		// Valid enum values
		const validCategories = Object.values(EventCategory);

		// Mapping for common LLM mistakes
		const categoryMapping: Record<string, EventCategory> = {
			// Common mistakes
			EVENT: EventCategory.ENTERTAINMENT,
			EVENTS: EventCategory.ENTERTAINMENT,
			SOCIAL: EventCategory.COMMUNITY,
			NETWORKING: EventCategory.BUSINESS,
			// Language-related (always EDUCATION)
			LANGUAGE: EventCategory.EDUCATION,
			CONVERSATION: EventCategory.EDUCATION,
			SPEAKING: EventCategory.EDUCATION,
			EXCHANGE: EventCategory.EDUCATION,
			LEARNING: EventCategory.EDUCATION,
			WORKSHOP: EventCategory.EDUCATION,
			// Cultural activities (now valid category)
			CULTURAL: EventCategory.CULTURE,
			'CULTURAL EXPERIENCE': EventCategory.CULTURE,
			HERITAGE: EventCategory.CULTURE,
			TRADITION: EventCategory.CULTURE,
			TRADITIONS: EventCategory.CULTURE,
			// Creative/craft activities
			CREATIVE: EventCategory.ART,
			PERSONALIZATION: EventCategory.OTHER,
			CRAFT: EventCategory.CULTURE,
			CRAFTS: EventCategory.CULTURE,
			// Community/social
			MEETUP: EventCategory.COMMUNITY,
			GATHERING: EventCategory.COMMUNITY,
			GATHERINGS: EventCategory.COMMUNITY,
			// Other common mistakes
			DINING: EventCategory.FOOD,
			PARTY: EventCategory.ENTERTAINMENT,
			MUSIC: EventCategory.ART,
			FITNESS: EventCategory.SPORTS,
			WELLNESS: EventCategory.HEALTH,
			CONFERENCE: EventCategory.BUSINESS,
		};

		if (!categories || categories.length === 0) {
			return [EventCategory.OTHER];
		}

		const sanitized: EventCategory[] = [];

		for (const cat of categories) {
			if (!cat || typeof cat !== 'string') continue;

			const upperCat = cat.toUpperCase().trim();

			if (validCategories.includes(upperCat as EventCategory)) {
				sanitized.push(upperCat as EventCategory);
			} else if (categoryMapping[upperCat]) {
				sanitized.push(categoryMapping[upperCat]);
			}
		}

		if (sanitized.length === 0) {
			sanitized.push(EventCategory.OTHER);
		}

		return sanitized.slice(0, 3);
	}

	/**
	 * Sanitize tags - ensure they are strings and lowercase
	 */
	private sanitizeTags(tags: unknown[]): string[] {
		if (!tags || tags.length === 0) {
			return [];
		}

		const sanitized: string[] = [];

		for (const tag of tags) {
			if (typeof tag !== 'string') continue;

			const cleaned = tag.trim().replace(/\s+/g, ' ').toLowerCase();

			if (cleaned.length > 0 && cleaned.length <= 50) {
				sanitized.push(cleaned);
			}
		}

		return sanitized.slice(0, 10);
	}
}
