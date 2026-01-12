import { Injectable } from '@nestjs/common';
import { CrawledEvent } from '@app/api/src/libs/dto/event/eventCrawling';
import { buildSafetyCheckPrompt, fillEventDataPrompt } from '../../libs/constants/llm.prompts';
import { EventCategory } from '@app/api/src/libs/enums/event.enum';

interface OllamaResponse {
	response: string;
}

interface EventCategorizationResponse {
	categories?: string[];
	tags?: string[];
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
				// Safety check
				const safetyCheck = await this.checkEventSafety(event);

				if (!safetyCheck.isSafe) {
					rejected.push(event);
					reasons.set(event.externalId || event.eventName, safetyCheck.reason);
					continue;
				}

				////////////////////////////////////////////////////////////
				// Step 2: Fill missing event data
				////////////////////////////////////////////////////////////
				// Add 2 second delay between requests to prevent CPU spike
				await new Promise((resolve) => setTimeout(resolve, 2000));

				// Fill missing data
				const completedEvent = await this.fillMissingEventData(event);
				safeEvents.push(completedEvent);

				// Add another delay after completion
				await new Promise((resolve) => setTimeout(resolve, 1000));
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
			console.log(`   ✓ Event already has categories and tags, skipping LLM completion`);
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
					options: {
						temperature: 0.1, // Low = more deterministic output
						num_predict: 100, // Max tokens to generate
						num_ctx: 512, // Context window size
						num_thread: 1, // CPU threads for inference
					},
				}),
			});

			if (!response.ok) throw new Error(`Ollama API error: ${response.statusText}`);

			const data = (await response.json()) as OllamaResponse;
			const aiResponse = data.response;

			// LOG AI RESPONSE for debugging
			console.log(`\n${'='.repeat(80)}`);
			console.log(`📝 DATA COMPLETION for: "${event.eventName}"`);
			console.log(`${'='.repeat(80)}`);
			console.log(aiResponse.substring(0, 500) + (aiResponse.length > 500 ? '...' : ''));
			console.log(`${'='.repeat(80)}\n`);

			// Try to extract JSON from response
			let parsedData: EventCategorizationResponse;
			try {
				// Try parsing the entire response first (if it's pure JSON)
				parsedData = JSON.parse(aiResponse.trim()) as EventCategorizationResponse;
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
						parsedData = JSON.parse(jsonStr.trim()) as EventCategorizationResponse;
					} catch (e) {
						const error = e as Error;
						console.error('Failed to parse extracted JSON:', jsonStr.substring(0, 200));
						throw new Error(`JSON parse error: ${error.message}`);
					}
				} else {
					console.error('No JSON pattern found in response');
					throw new Error('Could not extract JSON from AI response');
				}
			}

			// Validate and sanitize categories
			const sanitizedCategories = this.validateAndSanitizeCategories(parsedData.categories || [], event.eventName);

			// Sanitize tags (lowercase, no special chars except hyphen)
			const sanitizedTags =
				parsedData.tags && parsedData.tags.length > 0 ? this.sanitizeTags(parsedData.tags) : event.eventTags;

			const completedEvent: CrawledEvent = {
				...event,
				eventCategories: sanitizedCategories.length > 0 ? sanitizedCategories : event.eventCategories,
				eventTags: sanitizedTags,
			};

			console.log(
				`   Completed: categories=${completedEvent.eventCategories?.join(', ')}, tags=${completedEvent.eventTags?.slice(0, 3).join(', ')}...`,
			);

			return completedEvent;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.warn(`   Failed to complete event data: ${errorMessage}`);
			// Return original event on error
			return event;
		}
	}

	async checkEventSafety(event: CrawledEvent): Promise<{ isSafe: boolean; reason: string }> {
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
						temperature: 0.1,
						num_predict: 50,
						num_ctx: 512,
						num_thread: 1,
					},
				}),
			});

			if (!response.ok) throw new Error(`Ollama API error: ${response.statusText}`);
			const data = (await response.json()) as OllamaResponse;
			const aiResponse = data.response;

			// Extract JSON from response (it may contain additional text)
			const jsonMatch = aiResponse.match(/```json\s*(\{[\s\S]*?\})\s*```/);
			if (!jsonMatch) {
				console.warn('Could not extract JSON from AI response, accepting event by default');
				return { isSafe: true, reason: 'JSON parsing failed' };
			}

			const parsedResponse = JSON.parse(jsonMatch[1]) as SafetyCheckResponse;
			return { isSafe: parsedResponse.safe, reason: parsedResponse.reason || 'Safe' };
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
	private validateAndSanitizeCategories(categories: string[], eventName: string): EventCategory[] {
		// Valid enum values
		const validCategories = Object.values(EventCategory);

		// Mapping for common LLM mistakes
		const categoryMapping: Record<string, EventCategory> = {
			// Common mistakes
			EVENT: EventCategory.ENTERTAINMENT,
			EVENTS: EventCategory.ENTERTAINMENT,
			COMMUNITY: EventCategory.OTHER,
			SOCIAL: EventCategory.OTHER,
			NETWORKING: EventCategory.BUSINESS,
			LANGUAGE: EventCategory.EDUCATION,
			LEARNING: EventCategory.EDUCATION,
			WORKSHOP: EventCategory.EDUCATION,
			DINING: EventCategory.FOOD,
			PARTY: EventCategory.ENTERTAINMENT,
			MUSIC: EventCategory.ART,
			FITNESS: EventCategory.SPORTS,
			WELLNESS: EventCategory.HEALTH,
			CONFERENCE: EventCategory.BUSINESS,
			MEETUP: EventCategory.OTHER,
		};

		const sanitized: EventCategory[] = [];

		for (const cat of categories) {
			const upperCat = cat.toUpperCase().trim();

			// Check if it's a valid enum value
			if (validCategories.includes(upperCat as EventCategory)) {
				sanitized.push(upperCat as EventCategory);
			}
			// Check if we have a mapping for this mistake
			else if (categoryMapping[upperCat]) {
				console.warn(`   ⚠️  Mapped invalid category "${cat}" -> "${categoryMapping[upperCat]}" for "${eventName}"`);
				sanitized.push(categoryMapping[upperCat]);
			}
			// Otherwise skip this category
			else {
				console.warn(`   ⚠️  Ignoring invalid category "${cat}" for "${eventName}"`);
			}
		}

		// If no valid categories, default to OTHER
		if (sanitized.length === 0) {
			console.warn(`   ⚠️  No valid categories found, defaulting to OTHER for "${eventName}"`);
			sanitized.push(EventCategory.OTHER);
		}

		// Limit to 3 categories max
		return sanitized.slice(0, 3);
	}

	/**
	 * Sanitize tags - ensure they are strings and lowercase
	 */
	private sanitizeTags(tags: any[]): string[] {
		const sanitized: string[] = [];

		for (const tag of tags) {
			// Skip non-string values
			if (typeof tag !== 'string') {
				console.warn(`   ⚠️  Skipping non-string tag: ${typeof tag}`);
				continue;
			}

			// Clean and normalize
			const cleaned = tag
				.trim()
				.toLowerCase()
				.replace(/[^a-z0-9\s-]/g, '') // Remove special chars except hyphen
				.replace(/\s+/g, ' '); // Normalize spaces

			if (cleaned.length > 0 && cleaned.length <= 50) {
				sanitized.push(cleaned);
			}
		}

		// Limit to 10 tags max
		return sanitized.slice(0, 10);
	}
}
