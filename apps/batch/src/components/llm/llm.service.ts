import { Injectable } from '@nestjs/common';
import { CrawledEvent } from '@app/api/src/libs/dto/event/eventCrawling';
import { buildSafetyCheckPrompt, fillEventDataPrompt } from '../../libs/constants/llm.prompts';
import { EventCategory } from '@app/api/src/libs/enums/event.enum';
import { GoogleGenerativeAI, GenerativeModel, GenerateContentResult, FinishReason } from '@google/generative-ai';
import { logger } from '../../libs/logger';

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
	private readonly genAI: GoogleGenerativeAI;
	private readonly model: GenerativeModel;
	private readonly modelName: string;
	private readonly context = 'LLMService';

	constructor() {
		this.llmEnabled = true;

		const apiKey = process.env.GEMINI_API_KEY;
		if (!apiKey) throw new Error('GEMINI_API_KEY must be set');

		this.modelName = 'gemini-2.5-flash';
		this.genAI = new GoogleGenerativeAI(apiKey);
		this.model = this.genAI.getGenerativeModel({
			model: this.modelName,
			generationConfig: {
				temperature: 0.05,
			},
		});

		if (this.llmEnabled) {
			logger.info(this.context, `LLM enabled: ${this.modelName} via Gemini API`);
		} else {
			logger.warn(this.context, 'LLM is disabled.');
		}
	}

	async filterAndCompleteEvents(events: CrawledEvent[]): Promise<{
		accepted: CrawledEvent[];
		rejected: CrawledEvent[];
		reasons: Map<string, string>;
	}> {
		if (!this.llmEnabled) return { accepted: events, rejected: [], reasons: new Map() };

		logger.info(this.context, `Processing ${events.length} events with AI safety filter...`);

		const safeEvents: CrawledEvent[] = [];
		const rejected: CrawledEvent[] = [];
		const reasons = new Map<string, string>();

		// Process events sequentially with delay to prevent CPU overload
		for (let i = 0; i < events.length; i++) {
			const event = events[i];
			logger.info(this.context, `Processing event ${i + 1}/${events.length}`);

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
				logger.warn(this.context, `Processing error for "${event.eventName}": ${errorMessage}`);
				safeEvents.push(event);
			}
		}

		logger.info(this.context, `AI filtering complete: ${safeEvents.length} accepted, ${rejected.length} rejected`);
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
		let result: GenerateContentResult | null = null;
		let aiResponse: string | null = null;

		try {
			result = await this.model.generateContent(prompt);
			const response = result.response;

			// Check if prompt was blocked
			if (response.promptFeedback?.blockReason) {
				const blockReason = response.promptFeedback.blockReason;
				const blockMessage = response.promptFeedback.blockReasonMessage || 'No message provided';
				const safetyRatings = response.promptFeedback.safetyRatings || [];

				logger.error(
					this.context,
					`Prompt was blocked for event "${event.eventName || 'Unknown'}"`,
					undefined,
					`Block reason: ${blockReason}`,
					`Block message: ${blockMessage}`,
					`Safety ratings:`,
					JSON.stringify(safetyRatings, null, 2),
				);
				return event;
			}

			// Check if we have candidates
			if (!response.candidates || response.candidates.length === 0) {
				logger.error(
					this.context,
					`No candidates returned for event "${event.eventName || 'Unknown'}"`,
					undefined,
					`Full response:`,
					JSON.stringify(response, null, 2),
				);
				return event;
			}

			// Check finish reason
			const firstCandidate = response.candidates[0];
			const isTruncated = firstCandidate.finishReason === FinishReason.MAX_TOKENS;
			if (firstCandidate.finishReason && firstCandidate.finishReason !== FinishReason.STOP) {
				logger.warn(
					this.context,
					`Unexpected finish reason: ${firstCandidate.finishReason}`,
					`Finish message: ${firstCandidate.finishMessage || 'N/A'}`,
					`Event: ${event.eventName || 'Unknown'}`,
					isTruncated ? 'Response was truncated - will attempt to repair JSON' : '',
				);
			}

			// Get the text response
			try {
				aiResponse = response.text();
			} catch (textError) {
				const error = textError instanceof Error ? textError : new Error(String(textError));
				logger.error(
					this.context,
					`Failed to extract text from response for event "${event.eventName || 'Unknown'}"`,
					error,
					`Response structure:`,
					JSON.stringify(
						{
							candidates: response.candidates?.map((c) => ({
								index: c.index,
								finishReason: c.finishReason,
								finishMessage: c.finishMessage,
								safetyRatings: c.safetyRatings,
								contentParts:
									c.content?.parts?.map((p) => {
										// Part can be TextPart, InlineDataPart, FunctionCallPart, etc.
										// We only care about text parts for logging
										const part = p as { text?: string };
										const text = part?.text;
										return {
											text: typeof text === 'string' ? text.substring(0, 100) : 'N/A',
										};
									}) || [],
							})),
							promptFeedback: response.promptFeedback,
							usageMetadata: response.usageMetadata,
						},
						null,
						2,
					),
				);
				return event;
			}

			// Log usage metadata if available
			if (response.usageMetadata) {
				logger.debug(
					this.context,
					`Token usage for "${event.eventName || 'Unknown'}":`,
					`Prompt: ${response.usageMetadata.promptTokenCount},`,
					`Candidates: ${response.usageMetadata.candidatesTokenCount},`,
					`Total: ${response.usageMetadata.totalTokenCount}`,
				);
			}

			// Try to extract JSON from response
			let parsedData: EventCategorizationResponse;
			try {
				parsedData = JSON.parse(aiResponse.trim()) as EventCategorizationResponse;
			} catch (parseError) {
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

				// Pattern 4: First { to last } (or end of string if truncated)
				if (!jsonStr) {
					const firstBrace = aiResponse.indexOf('{');
					if (firstBrace !== -1) {
						// If truncated, use everything from { to end, otherwise find last }
						if (isTruncated) {
							jsonStr = aiResponse.substring(firstBrace);
						} else {
							const lastBrace = aiResponse.lastIndexOf('}');
							if (lastBrace !== -1 && lastBrace > firstBrace) {
								jsonStr = aiResponse.substring(firstBrace, lastBrace + 1);
							}
						}
					}
				}

				if (jsonStr) {
					// If response was truncated, try to repair incomplete JSON
					if (isTruncated) {
						jsonStr = this.repairTruncatedJSON(jsonStr);
					}

					try {
						parsedData = JSON.parse(jsonStr.trim()) as EventCategorizationResponse;
					} catch (e) {
						const error = e as Error;
						const errorMsg = `JSON parse error after extraction: ${error.message}`;
						logger.error(
							this.context,
							errorMsg,
							error,
							`Raw AI Response (${aiResponse.length} chars, first 2000):`,
							aiResponse.substring(0, 2000),
							`Extracted JSON string (first 500 chars):`,
							jsonStr.substring(0, 500),
							`Was truncated: ${isTruncated}`,
							`Full response structure:`,
							JSON.stringify(
								{
									candidates: result?.response.candidates?.length || 0,
									promptFeedback: result?.response.promptFeedback,
									usageMetadata: result?.response.usageMetadata,
								},
								null,
								2,
							),
						);
						throw new Error(errorMsg);
					}
				} else {
					const errorMsg = 'Could not extract JSON from AI response';
					logger.error(
						this.context,
						errorMsg,
						parseError instanceof Error ? parseError : undefined,
						`Raw AI Response (${aiResponse.length} chars, first 2000):`,
						aiResponse.substring(0, 2000),
						`Was truncated: ${isTruncated}`,
						`Full response structure:`,
						JSON.stringify(
							{
								candidates:
									result?.response.candidates?.map((c) => ({
										index: c.index,
										finishReason: c.finishReason,
										finishMessage: c.finishMessage,
										hasContent: !!c.content,
										partsCount: c.content?.parts?.length || 0,
									})) || [],
								promptFeedback: result?.response.promptFeedback,
								usageMetadata: result?.response.usageMetadata,
							},
							null,
							2,
						),
					);
					throw new Error(errorMsg);
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
			const errorStack = error instanceof Error ? error.stack : undefined;

			logger.error(
				this.context,
				`Failed to fill missing event data for "${event.eventName || 'Unknown'}": ${errorMessage}`,
				error instanceof Error ? error : undefined,
				aiResponse
					? `Raw AI Response (${aiResponse.length} chars, first 2000): ${aiResponse.substring(0, 2000)}`
					: 'No AI response received',
				result
					? `Response structure available: ${JSON.stringify(
							{
								hasCandidates: !!result.response.candidates?.length,
								candidatesCount: result.response.candidates?.length || 0,
								hasPromptFeedback: !!result.response.promptFeedback,
								blockReason: result.response.promptFeedback?.blockReason,
								hasUsageMetadata: !!result.response.usageMetadata,
							},
							null,
							2,
						)}`
					: 'No result object',
			);

			if (errorStack) {
				logger.error(this.context, `Stack trace:`, undefined, errorStack);
			}

			return event;
		}
	}

	/**
	 * Attempts to repair truncated JSON by closing incomplete structures
	 * Handles cases where MAX_TOKENS cut off the response mid-JSON
	 */
	private repairTruncatedJSON(jsonStr: string): string {
		let repaired = jsonStr.trim();

		// Remove trailing comma if present
		repaired = repaired.replace(/,\s*$/, '');

		// Count open/close braces and brackets to determine what needs closing
		const openBraces = (repaired.match(/\{/g) || []).length;
		const closeBraces = (repaired.match(/\}/g) || []).length;
		const openBrackets = (repaired.match(/\[/g) || []).length;
		const closeBrackets = (repaired.match(/\]/g) || []).length;

		// Check if we're in the middle of a string (odd number of quotes before the end)
		const lastQuoteIndex = repaired.lastIndexOf('"');
		const quotesBeforeEnd = (repaired.substring(0, lastQuoteIndex).match(/"/g) || []).length;
		const isInString = quotesBeforeEnd % 2 === 1 && lastQuoteIndex === repaired.length - 1;

		// If we're in the middle of a string, close it
		if (isInString) {
			repaired += '"';
		}

		// Close incomplete arrays
		for (let i = closeBrackets; i < openBrackets; i++) {
			repaired += ']';
		}

		// Close incomplete objects
		for (let i = closeBraces; i < openBraces; i++) {
			repaired += '}';
		}

		return repaired;
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
		let result: GenerateContentResult | null = null;
		let aiResponse: string | null = null;

		try {
			result = await this.model.generateContent(prompt);
			const response = result.response;

			// Check if prompt was blocked
			if (response.promptFeedback?.blockReason) {
				const blockReason = response.promptFeedback.blockReason;
				const blockMessage = response.promptFeedback.blockReasonMessage || 'No message provided';
				logger.warn(
					this.context,
					`Safety check prompt was blocked`,
					`Block reason: ${blockReason}`,
					`Block message: ${blockMessage}`,
					`Event: ${event.eventName || 'Unknown'}`,
				);
				return { isSafe: true, reason: `Prompt blocked: ${blockReason}` };
			}

			// Check if we have candidates
			if (!response.candidates || response.candidates.length === 0) {
				logger.error(
					this.context,
					`No candidates returned in safety check`,
					undefined,
					`Full response:`,
					JSON.stringify(response, null, 2),
				);
				return { isSafe: true, reason: 'No candidates returned' };
			}

			// Get the text response
			try {
				const textResult = response.text();
				aiResponse = textResult;
			} catch (textError) {
				const error = textError instanceof Error ? textError : new Error(String(textError));
				logger.error(
					this.context,
					`Failed to extract text in safety check`,
					error,
					`Response structure:`,
					JSON.stringify(
						{
							candidates: response.candidates?.map((c) => ({
								index: c.index,
								finishReason: c.finishReason,
								finishMessage: c.finishMessage,
								safetyRatings: c.safetyRatings,
							})),
							promptFeedback: response.promptFeedback,
						},
						null,
						2,
					),
				);
				return { isSafe: true, reason: 'Failed to extract text' };
			}

			let parsedResponse: SafetyCheckResponse;
			try {
				parsedResponse = JSON.parse(aiResponse.trim()) as SafetyCheckResponse;
			} catch (parseError) {
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
					} catch (e) {
						const error = e as Error;
						logger.error(
							this.context,
							`JSON parse error in safety check: ${error.message}`,
							error,
							`Raw AI Response:`,
							aiResponse && typeof aiResponse === 'string' ? aiResponse.substring(0, 1000) : 'N/A',
							`Extracted JSON:`,
							jsonStr.substring(0, 500),
						);
						return { isSafe: true, reason: 'JSON parsing failed' };
					}
				} else {
					logger.error(
						this.context,
						'Could not extract JSON from AI response in safety check',
						parseError instanceof Error ? parseError : undefined,
						aiResponse && typeof aiResponse === 'string'
							? `Raw AI Response (${aiResponse.length} chars): ${aiResponse.substring(0, 2000)}`
							: 'No AI response available',
					);
					return { isSafe: true, reason: 'JSON parsing failed' };
				}
			}

			if (typeof parsedResponse.safe !== 'boolean') {
				logger.warn(
					this.context,
					`Invalid LLM response format in safety check. Expected boolean 'safe' field.`,
					aiResponse && typeof aiResponse === 'string'
						? `Raw AI Response: ${aiResponse.substring(0, 1000)}`
						: 'No AI response available',
				);
				return { isSafe: true, reason: 'Invalid LLM response format' };
			}

			return { isSafe: parsedResponse.safe, reason: parsedResponse.reason || '' };
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			const errorStack = error instanceof Error ? error.stack : undefined;

			let responsePreview = 'No AI response received';
			if (aiResponse !== null && aiResponse !== undefined) {
				const responseStr = String(aiResponse);
				if (responseStr.length > 0) {
					responsePreview = responseStr.substring(0, 1000);
				}
			}

			logger.error(
				this.context,
				`Gemini API error in safety check: ${errorMessage}`,
				error instanceof Error ? error : undefined,
				`Raw AI Response: ${responsePreview}`,
				result
					? `Response structure: ${JSON.stringify(
							{
								hasCandidates: !!result.response.candidates?.length,
								blockReason: result.response.promptFeedback?.blockReason,
							},
							null,
							2,
						)}`
					: 'No result object',
			);

			if (errorStack) {
				logger.error(this.context, `Stack trace:`, undefined, errorStack);
			}

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
