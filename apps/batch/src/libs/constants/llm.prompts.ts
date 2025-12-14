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
	// Extract raw HTML from scraper
	const rawHtml = event.rawData?.raw_html || '';

	// Create a clean version of raw data without the large HTML field
	const rawDataClean = event.rawData ? { ...event.rawData } : {};
	delete rawDataClean.raw_html;

	return `Task: Assign categories and tags to this event.

EVENT NAME: 
${event.eventName}

EVENT DESCRIPTION (TEXT): 
${event.eventDesc?.substring(0, 600) || 'N/A'}

RAW HTML FROM PAGE (may contain extra keywords/details):
${rawHtml ? String(rawHtml).substring(0, 1000) : 'N/A'}

RAW STRUCTURED DATA (topics, group info, metadata):
${JSON.stringify(rawDataClean, null, 2).substring(0, 1200)}

INSTRUCTIONS:
Analyze ALL information above to assign 1-3 categories and 5-10 tags.

AVAILABLE CATEGORIES (choose 1-3):
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

EXAMPLES:
- "Seoul AI Meetup" → {"categories":["TECHNOLOGY"],"tags":["ai","meetup","tech","seoul","networking"]}
- "Korean Language Exchange" → {"categories":["EDUCATION"],"tags":["language","korean","learning","exchange","social"]}
- "Blockchain Networking" → {"categories":["TECHNOLOGY","BUSINESS"],"tags":["blockchain","crypto","web3","networking"]}

OUTPUT (ONLY JSON, no markdown, no text):
{"categories":["CATEGORY1"],"tags":["tag1","tag2","tag3","tag4","tag5"]}`;
}
