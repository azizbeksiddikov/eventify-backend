import { CrawledEvent } from '@app/api/src/libs/dto/event/eventCrawling';
import { LLM_PROMPTS } from './llm.constants';

/**
 * Build safety check prompt - extremely minimal filtering
 */
export function buildSafetyCheckPrompt(event: CrawledEvent): string {
	const desc = event.eventDesc;
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

OUTPUT FORMAT (valid JSON only):
{"safe": true, "reason": ""}  OR  {"safe": false, "reason": "specific reason"}

Default to safe=true unless CLEARLY inappropriate.`;
}

export function fillEventDataPrompt(event: CrawledEvent): string {
	return `Task: Extract and fill missing event data from the raw data provided. Fill in ALL fields that are missing or incomplete.

RAW DATA FROM SCRAPER:
${JSON.stringify(event.rawData, null, 2)}

CURRENT EVENT DATA (with missing/incomplete fields):
${JSON.stringify(
	{
		eventType: event.eventType,
		eventName: event.eventName,
		eventDesc: event.eventDesc,
		eventImages: event.eventImages,
		eventPrice: event.eventPrice,
		eventCurrency: event.eventCurrency,
		eventStartAt: event.eventStartAt,
		eventEndAt: event.eventEndAt,
		locationType: event.locationType,
		eventCity: event.eventCity,
		eventAddress: event.eventAddress,
		coordinateLatitude: event.coordinateLatitude,
		coordinateLongitude: event.coordinateLongitude,
		eventStatus: event.eventStatus,
		eventCategories: event.eventCategories,
		eventTags: event.eventTags,
		externalId: event.externalId,
		externalUrl: event.externalUrl,
		attendeeCount: event.attendeeCount,
		eventCapacity: event.eventCapacity,
	},
	null,
	2,
)}

INSTRUCTIONS:
1. Fill in ALL missing/null fields from the raw data where possible
2. If data is not available in raw data, set optional fields to null
3. Preserve existing non-null values unless raw data clearly has better information
4. For eventStatus:
   - Use "UPCOMING" if eventStartAt is in the future (after ${new Date().toISOString()})
   - Use "ONGOING" if event is currently happening
5. For eventType:
   - Use "ONCE" for single events
   - Use "RECURRING" if event repeats (check raw data for recurrence info)
6. For eventPrice:
   - Must be a number (0 for free events)
   - Extract numeric value from price strings (e.g., "$25" → 25, "Free" → 0)
7. For eventCategories:
   - Assign 1-3 most relevant categories from the list below
   - Choose based on event name, description, and tags
8. For eventTags:
   - Extract 3-10 relevant keywords from event name/description
   - Use lowercase, single words or short phrases
9. For locationType:
   - Use "ONLINE" for virtual/online events
   - Use "OFFLINE" for physical/in-person events
10. For coordinates:
    - Extract if available in raw data, otherwise set to null
    - Must be valid numbers (latitude: -90 to 90, longitude: -180 to 180)

AVAILABLE CATEGORIES (EventCategory enum - choose 1-3):
- TECHNOLOGY: AI, coding, software, tech, blockchain, data science, programming
- BUSINESS: entrepreneurship, networking, career, marketing, sales, startups
- SPORTS: fitness, yoga, running, sports, outdoor activities, gym, athletics
- ART: music, concerts, art, painting, dance, theater, creative activities
- EDUCATION: workshops, classes, courses, language exchange, learning, training
- FOOD: dining, cooking, restaurants, food events, culinary experiences
- HEALTH: wellness, mental health, meditation, healthcare, therapy
- ENTERTAINMENT: movies, games, concerts, nightlife, comedy, fun activities
- TRAVEL: trips, tourism, sightseeing, exploration, adventures
- POLITICS: political events, campaigns, debates, civic engagement
- RELIGION: religious services, spiritual gatherings, faith-based events
- OTHER: events that don't fit other categories

CATEGORY EXAMPLES:
- "Seoul AI Meetup" → ["TECHNOLOGY"]
- "Korean Language Exchange at Cafe" → ["EDUCATION"]
- "Startup Networking Night" → ["BUSINESS"]
- "Yoga in the Park" → ["SPORTS", "HEALTH"]
- "Friday Movie Night" → ["ENTERTAINMENT"]
- "Tech & Business Summit" → ["TECHNOLOGY", "BUSINESS"]

OUTPUT FORMAT (valid JSON only, no additional text):
{
  "eventType": "ONCE" | "RECURRING",
  "eventName": "string",
  "eventDesc": "string (detailed description)",
  "eventImages": ["url1", "url2"],
  "eventPrice": number (0 for free),
  "eventCurrency"?: "string",
  "eventStartAt": "ISO8601 datetime string",
  "eventEndAt": "ISO8601 datetime string",
  "locationType": "ONLINE" | "OFFLINE",
  "eventCity": "string" | null,
  "eventAddress": "full address string" | null,
  "coordinateLatitude": number | null,
  "coordinateLongitude": number | null,
  "eventStatus": "UPCOMING" | "ONGOING",
  "eventCategories": ["CATEGORY1", "CATEGORY2"],
  "eventTags": ["tag1", "tag2", "tag3"],
  "externalId": "string" | null,
  "externalUrl": "string" | null,
  "attendeeCount": number (default 0),
  "eventCapacity": number | null
}

Return ONLY the JSON object. No markdown, no explanation, just valid JSON.`;
}
