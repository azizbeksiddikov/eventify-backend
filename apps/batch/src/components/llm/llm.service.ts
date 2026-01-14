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
			console.log(`   Event already has categories and tags, skipping LLM completion`);
			return event;
		}

		console.log(`\n${'='.repeat(80)}`);
		console.log(`LLM: DATA COMPLETION for: "${event.eventName}"`);
		console.log(`   Needs categories: ${needsCategories} (current: ${event.eventCategories?.length || 0})`);
		console.log(`   Needs tags: ${needsTags} (current: ${event.eventTags?.length || 0})`);
		console.log(`${'='.repeat(80)}`);

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
						num_ctx: 2048,
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

			// LOG FULL AI RESPONSE for debugging
			console.log(`\nLLM: FULL RESPONSE (${aiResponse.length} chars):`);
			console.log(`${'-'.repeat(80)}`);
			console.log(aiResponse);
			console.log(`${'-'.repeat(80)}`);

			// Try to extract JSON from response
			let parsedData: EventCategorizationResponse;
			let parseError: Error | null = null;
			try {
				// Try parsing the entire response first (if it's pure JSON)
				parsedData = JSON.parse(aiResponse.trim()) as EventCategorizationResponse;
				console.log(`LLM: Successfully parsed as pure JSON`);
			} catch (parseErr) {
				parseError = parseErr as Error;
				console.log(`ERROR: Direct JSON parse failed: ${parseError.message}`);
				console.log(`   Attempting pattern extraction...`);

				// If that fails, try multiple extraction patterns
				let jsonStr: string | null = null;
				let extractionMethod = '';

				// Pattern 1: JSON in markdown code block
				let match = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
				if (match) {
					jsonStr = match[1];
					extractionMethod = 'markdown code block (```json)';
				}

				// Pattern 2: JSON in plain code block
				if (!jsonStr) {
					match = aiResponse.match(/```\s*(\{[\s\S]*?\})\s*```/);
					if (match) {
						jsonStr = match[1];
						extractionMethod = 'plain code block (```)';
					}
				}

				// Pattern 3: Any JSON object in the response
				if (!jsonStr) {
					match = aiResponse.match(/(\{[\s\S]*\})/);
					if (match) {
						jsonStr = match[0];
						extractionMethod = 'first JSON object match';
					}
				}

				// Pattern 4: Extract from first { to last } (most lenient)
				if (!jsonStr) {
					const firstBrace = aiResponse.indexOf('{');
					const lastBrace = aiResponse.lastIndexOf('}');
					if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
						jsonStr = aiResponse.substring(firstBrace, lastBrace + 1);
						extractionMethod = 'first { to last }';
					}
				}

				if (jsonStr) {
					console.log(`Extracted JSON using method: ${extractionMethod}`);
					console.log(`   Extracted JSON (${jsonStr.length} chars): ${jsonStr.substring(0, 300)}${jsonStr.length > 300 ? '...' : ''}`);
					try {
						parsedData = JSON.parse(jsonStr.trim()) as EventCategorizationResponse;
						console.log(`Successfully parsed extracted JSON`);
					} catch (e) {
						const error = e as Error;
						console.error(`ERROR: Failed to parse extracted JSON:`);
						console.error(`   Error: ${error.message}`);
						console.error(`   Extracted string (first 500 chars): ${jsonStr.substring(0, 500)}`);
						throw new Error(`JSON parse error after extraction: ${error.message}`);
					}
				} else {
					console.error(`ERROR: No JSON pattern found in response`);
					console.error(`   Response length: ${aiResponse.length}`);
					console.error(`   First 500 chars: ${aiResponse.substring(0, 500)}`);
					throw new Error('Could not extract JSON from AI response');
				}
			}

			// Log what was parsed
			console.log(`\nPARSED DATA:`);
			console.log(`   Categories (raw): ${JSON.stringify(parsedData.categories)}`);
			console.log(`   Tags (raw): ${JSON.stringify(parsedData.tags)}`);

			// Validate and sanitize categories
			const sanitizedCategories = this.validateAndSanitizeCategories(parsedData.categories || [], event.eventName);
			console.log(`   Categories (sanitized): ${JSON.stringify(sanitizedCategories)}`);

			// Merge original tags with LLM tags - NEVER reduce tag count
			const originalTags = event.eventTags || [];
			const llmTags = parsedData.tags && parsedData.tags.length > 0 ? this.sanitizeTags(parsedData.tags) : [];
			
			// Merge: start with original tags, add new LLM tags that don't already exist
			const mergedTags = [...originalTags];
			for (const llmTag of llmTags) {
				// Add LLM tag if it's not already in the original tags (case-insensitive)
				const tagExists = mergedTags.some(
					existingTag => existingTag.toLowerCase() === llmTag.toLowerCase()
				);
				if (!tagExists) {
					mergedTags.push(llmTag);
				}
			}
			
			const sanitizedTags = mergedTags.length > 0 ? mergedTags : originalTags;
			console.log(`   Tags (original): ${JSON.stringify(originalTags)}`);
			console.log(`   Tags (from LLM): ${JSON.stringify(llmTags)}`);
			console.log(`   Tags (merged): ${JSON.stringify(sanitizedTags)}`);

			// Check if we actually got data
			const hasCategories = sanitizedCategories.length > 0;
			const hasTags = sanitizedTags && sanitizedTags.length > 0;

			if (!hasCategories && needsCategories) {
				console.warn(`WARNING: Event needed categories but got none after sanitization`);
				console.warn(`   Original categories: ${JSON.stringify(event.eventCategories)}`);
				console.warn(`   Parsed categories: ${JSON.stringify(parsedData.categories)}`);
			}

			if (!hasTags && needsTags) {
				console.warn(`WARNING: Event needed tags but got none after sanitization`);
				console.warn(`   Original tags: ${JSON.stringify(event.eventTags)}`);
				console.warn(`   Parsed tags: ${JSON.stringify(parsedData.tags)}`);
			}

			const completedEvent: CrawledEvent = {
				...event,
				eventCategories: sanitizedCategories.length > 0 ? sanitizedCategories : event.eventCategories,
				eventTags: sanitizedTags,
			};

			console.log(`\nLLM: AFTER:`);
			console.log(`   Categories: ${completedEvent.eventCategories?.join(', ') || 'NONE'}`);
			console.log(`   Tags: ${completedEvent.eventTags?.slice(0, 10).join(', ') || 'NONE'}${completedEvent.eventTags && completedEvent.eventTags.length > 10 ? `... (${completedEvent.eventTags.length} total)` : ''}`);


			return completedEvent;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			const errorStack = error instanceof Error ? error.stack : undefined;
			console.error(`\nERROR: FAILED to complete event data for "${event.eventName}":`);
			console.error(`   Error: ${errorMessage}`);
			if (errorStack) {
				console.error(`   Stack: ${errorStack.split('\n').slice(0, 5).join('\n')}`);
			}
			console.error(`${'='.repeat(80)}\n`);
			// Return original event on error
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
			{ keyword: 'gentlemen\'s club', reason: 'Adult entertainment venue' },
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
			console.log(`Quick keyword filter triggered: ${quickCheck.reason}`);
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
					keep_alive: '5m', // Keep model in memory for 5 minutes (will auto-unload after)
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

		console.log(`Safety Check Response: ${aiResponse}`);

		// Extract JSON from response (it may contain additional text)
		const jsonMatch = aiResponse.match(/```json\s*(\{[\s\S]*?\})\s*```/);
		if (!jsonMatch) {
			console.warn('Could not extract JSON from AI response, accepting event by default');
			console.warn(`Full response: ${aiResponse}`);
			return { isSafe: true, reason: 'JSON parsing failed' };
		}

		const parsedResponse = JSON.parse(jsonMatch[1]) as SafetyCheckResponse;
		console.log(`Parsed Safety Result: safe=${parsedResponse.safe}, reason="${parsedResponse.reason}"`);
		
		// Better default messaging
		const defaultReason = parsedResponse.safe ? 'Passed safety check' : 'No specific reason provided';
		return { isSafe: parsedResponse.safe, reason: parsedResponse.reason || defaultReason };
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

		if (!categories || categories.length === 0) {
			console.warn(`ERROR: Empty categories array received for "${eventName}"`);
			return [EventCategory.OTHER];
		}

		console.log(`LLM: Validating ${categories.length} category(ies): ${categories.join(', ')}`);

		const sanitized: EventCategory[] = [];
		const invalidCategories: string[] = [];

		for (const cat of categories) {
			if (!cat || typeof cat !== 'string') {
				console.warn(`ERROR: Skipping non-string category: ${typeof cat} = ${cat}`);
				continue;
			}

			const upperCat = cat.toUpperCase().trim();

			// Check if it's a valid enum value
			if (validCategories.includes(upperCat as EventCategory)) {
				sanitized.push(upperCat as EventCategory);
				console.log(`LLM: Valid category: ${upperCat}`);
			}
			// Check if we have a mapping for this mistake
			else if (categoryMapping[upperCat]) {
				console.warn(`    Mapped invalid category "${cat}" -> "${categoryMapping[upperCat]}" for "${eventName}"`);
				sanitized.push(categoryMapping[upperCat]);
			}
			// Otherwise skip this category
			else {
				invalidCategories.push(cat);
				console.warn(`ERROR: Ignoring invalid category "${cat}" for "${eventName}"`);
				console.warn(`      Valid categories are: ${validCategories.join(', ')}`);
			}
		}

		// If no valid categories, default to OTHER
		if (sanitized.length === 0) {
			console.warn(`ERROR: No valid categories found after validation, defaulting to OTHER for "${eventName}"`);
			console.warn(`      Invalid categories received: ${invalidCategories.join(', ')}`);
			sanitized.push(EventCategory.OTHER);
		}

		// Limit to 3 categories max
		const result = sanitized.slice(0, 3);
		if (sanitized.length > 3) {
			console.warn(`    Limited categories from ${sanitized.length} to 3 (max allowed)`);
		}

		return result;
	}

	/**
	 * Sanitize tags - ensure they are strings and lowercase
	 */
	private sanitizeTags(tags: any[]): string[] {
		if (!tags || tags.length === 0) {
			console.warn(`    Empty tags array received`);
			return [];
		}

		console.log(`   Sanitizing ${tags.length} tag(s): ${tags.slice(0, 5).join(', ')}${tags.length > 5 ? '...' : ''}`);

		const sanitized: string[] = [];
		const skipped: Array<{ tag: any; reason: string }> = [];

		for (const tag of tags) {
			// Skip non-string values
			if (typeof tag !== 'string') {
				skipped.push({ tag, reason: `non-string (${typeof tag})` });
				console.warn(`    Skipping non-string tag: ${typeof tag} = ${tag}`);
				continue;
			}

			// Clean and normalize
			const cleaned = tag
				.trim()
				.toLowerCase()
				.replace(/[^a-z0-9\s-]/g, '') // Remove special chars except hyphen
				.replace(/\s+/g, ' '); // Normalize spaces

			if (cleaned.length === 0) {
				skipped.push({ tag, reason: 'empty after cleaning' });
				console.warn(`    Skipping empty tag after cleaning: "${tag}"`);
				continue;
			}

			if (cleaned.length > 50) {
				skipped.push({ tag, reason: `too long (${cleaned.length} > 50)` });
				console.warn(`    Skipping tag too long (${cleaned.length} chars): "${cleaned.substring(0, 50)}..."`);
				continue;
			}

			sanitized.push(cleaned);
		}

		if (skipped.length > 0) {
			console.warn(`    Skipped ${skipped.length} invalid tag(s): ${skipped.map(s => `${s.tag} (${s.reason})`).join(', ')}`);
		}

		// Limit to 10 tags max
		const result = sanitized.slice(0, 10);
		if (sanitized.length > 10) {
			console.warn(`    Limited tags from ${sanitized.length} to 10 (max allowed)`);
		}

		console.log(` Sanitized ${result.length} valid tag(s)`);
		return result;
	}
}
