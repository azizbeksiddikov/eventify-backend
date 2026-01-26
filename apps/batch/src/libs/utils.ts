import { EventStatus, EventCategory } from '@app/api/src/libs/enums/event.enum';
import path from 'path';
import fs from 'fs';
import { logger } from './logger';

// Event Status
export function determineStatus(eventStartAt: Date, eventEndAt: Date): EventStatus {
	const now = new Date();

	if (eventEndAt < now) {
		return EventStatus.COMPLETED;
	} else if (eventStartAt <= now && now <= eventEndAt) {
		return EventStatus.ONGOING;
	} else {
		return EventStatus.UPCOMING;
	}
}

// Event Category
const CATEGORY_MAP = {
	sport: EventCategory.SPORTS,
	sports: EventCategory.SPORTS,
	art: EventCategory.ART,
	arts: EventCategory.ART,
	tech: EventCategory.TECHNOLOGY,
	technology: EventCategory.TECHNOLOGY,
	programming: EventCategory.TECHNOLOGY,
	code: EventCategory.TECHNOLOGY,
	coding: EventCategory.TECHNOLOGY,
	food: EventCategory.FOOD,
	cooking: EventCategory.FOOD,
	restaurant: EventCategory.FOOD,
	travel: EventCategory.TRAVEL,
	tourism: EventCategory.TRAVEL,
	education: EventCategory.EDUCATION,
	learn: EventCategory.EDUCATION,
	learning: EventCategory.EDUCATION,
	health: EventCategory.HEALTH,
	fitness: EventCategory.HEALTH,
	wellness: EventCategory.HEALTH,
	entertainment: EventCategory.ENTERTAINMENT,
	music: EventCategory.ENTERTAINMENT,
	movie: EventCategory.ENTERTAINMENT,
	business: EventCategory.BUSINESS,
	networking: EventCategory.BUSINESS,
	startup: EventCategory.BUSINESS,
	politics: EventCategory.POLITICS,
	religion: EventCategory.RELIGION,
	spiritual: EventCategory.RELIGION,
};

export function mapTagsToCategories(tags: string[]): EventCategory[] {
	const categories = new Set<EventCategory>();

	tags.forEach((tag) => {
		const normalizedTag = tag.toLowerCase().trim();
		const category = CATEGORY_MAP[normalizedTag as keyof typeof CATEGORY_MAP];
		if (category) categories.add(category);
	});

	return categories.size > 0 ? Array.from(categories) : [EventCategory.OTHER];
}

export function saveToJsonFile(filepath: string, data: unknown): void {
	try {
		// Create jsons directory if it doesn't exist
		const jsonsDir = path.dirname(filepath);
		if (!fs.existsSync(jsonsDir)) fs.mkdirSync(jsonsDir, { recursive: true });

		// Write to file
		fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		logger.warn('utils', `Failed to save to JSON file: ${errorMessage}`);
	}
}

export function mergeJsonData(firstJsonData: unknown, secondJsonData: unknown): unknown {
	const bothAreArrays = Array.isArray(firstJsonData) && Array.isArray(secondJsonData);
	if (bothAreArrays) {
		return [...(firstJsonData as unknown[]), ...(secondJsonData as unknown[])];
	}

	const bothAreObjects =
		typeof firstJsonData === 'object' &&
		firstJsonData !== null &&
		typeof secondJsonData === 'object' &&
		secondJsonData !== null;
	if (bothAreObjects) {
		return { ...(firstJsonData as Record<string, unknown>), ...(secondJsonData as Record<string, unknown>) };
	}

	// Return second data if available, otherwise first
	return secondJsonData || firstJsonData;
}

/**
 * Deep merge two objects (for merging API responses)
 * Used by scrapers to merge nested JSON data structures
 */
export function deepMerge(target: unknown, source: unknown): unknown {
	if (!source) return target;
	if (!target) return source;

	// If both are arrays, concatenate
	if (Array.isArray(target) && Array.isArray(source)) {
		return [...(target as unknown[]), ...(source as unknown[])];
	}

	// If both are objects, merge recursively
	if (
		typeof target === 'object' &&
		target !== null &&
		typeof source === 'object' &&
		source !== null &&
		!Array.isArray(target) &&
		!Array.isArray(source)
	) {
		const result = { ...(target as Record<string, unknown>) };
		const sourceObj = source as Record<string, unknown>;
		for (const key in sourceObj) {
			if (Object.prototype.hasOwnProperty.call(sourceObj, key)) {
				result[key] = deepMerge(result[key], sourceObj[key]);
			}
		}
		return result;
	}

	// Otherwise, prefer source
	return source;
}

/**
 * Random delay to simulate human behavior and avoid rate limiting
 * Used by scrapers between requests
 */
export async function randomDelay(minMs: number, maxMs: number): Promise<void> {
	const delay = Math.floor(Math.random() * (maxMs - minMs) + minMs);
	await new Promise((resolve) => setTimeout(resolve, delay));
}
