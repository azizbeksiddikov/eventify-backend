import { EventStatus, EventCategory } from '@app/api/src/libs/enums/event.enum';

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
