import { CrawledEvent } from '@app/api/src/libs/dto/event/eventCrawling';

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

	return `You are a precise event categorization system. Your task is to assign EXACTLY the right categories and tags.

=== EVENT DATA ===

NAME: ${event.eventName}

DESCRIPTION: ${event.eventDesc?.substring(0, 600) || 'N/A'}

HTML CONTENT: ${rawHtml ? String(rawHtml).substring(0, 1000) : 'N/A'}

METADATA: ${JSON.stringify(rawDataClean, null, 2).substring(0, 1200)}

=== CATEGORIZATION RULES ===

Select 1-3 categories from this EXACT list (case-sensitive):

TECHNOLOGY - Software, AI, coding, blockchain, programming, data science, tech meetups
BUSINESS - Entrepreneurship, networking, career, marketing, sales, startups, professional events
SPORTS - Fitness, yoga, running, gym, athletics, exercise, outdoor sports activities
ART - Music, concerts, painting, dance, theater, photography, design, creative arts
EDUCATION - Classes, courses, workshops, language learning, tutoring, training, academic
FOOD - Dining, cooking, restaurants, culinary events, food tastings, meals
HEALTH - Wellness, mental health, meditation, healthcare, therapy, mindfulness
ENTERTAINMENT - Movies, games, nightlife, comedy, parties, social fun, bars, clubs
TRAVEL - Trips, tourism, sightseeing, exploration, adventures, tours
POLITICS - Political events, campaigns, debates, civic engagement, activism
RELIGION - Religious services, spiritual gatherings, faith-based events
OTHER - Anything that doesn't clearly fit above categories

=== CRITICAL RULES ===

1. LANGUAGE EVENTS = EDUCATION ONLY
   - English conversation, language exchange, language practice → EDUCATION
   - DO NOT add SPORTS, ART, or ENTERTAINMENT to language events
   - These are learning activities, not physical activities

2. Choose the PRIMARY purpose of the event
   - Don't mix unrelated categories
   - Maximum 2-3 categories, usually just 1-2

3. Be PRECISE, not creative
   - If it's about learning → EDUCATION
   - If it's about food → FOOD
   - If it's about exercise → SPORTS
   - If it's about movies/socializing → ENTERTAINMENT

=== CORRECT EXAMPLES ===

✅ "English Conversation Practice"
   → {"categories":["EDUCATION"],"tags":["language","english","conversation","practice","learning"]}

✅ "Korean Language Exchange"
   → {"categories":["EDUCATION"],"tags":["korean","language","exchange","learning","social"]}

✅ "AI Meetup"
   → {"categories":["TECHNOLOGY"],"tags":["ai","meetup","tech","networking","learning"]}

✅ "Yoga Class"
   → {"categories":["SPORTS","HEALTH"],"tags":["yoga","fitness","exercise","wellness","health"]}

✅ "Movie Night"
   → {"categories":["ENTERTAINMENT"],"tags":["movies","film","social","fun","cinema"]}

✅ "Restaurant Dinner"
   → {"categories":["FOOD"],"tags":["dining","restaurant","food","social","meal"]}

=== WRONG EXAMPLES (DO NOT DO THIS) ===

❌ "English Conversation" → ["EDUCATION","SPORTS"] - WRONG! No physical activity
❌ "Language Exchange" → ["EDUCATION","ART"] - WRONG! Not creative arts
❌ "Tech Meetup" → ["TECHNOLOGY","FOOD","ENTERTAINMENT"] - WRONG! Too many categories
❌ "Movie Night" → ["ENTERTAINMENT","SPORTS"] - WRONG! Not physical activity

=== OUTPUT FORMAT ===

Return ONLY valid JSON with this exact structure:
{"categories":["CATEGORY1"],"tags":["tag1","tag2","tag3","tag4","tag5"]}

NO markdown, NO explanations, ONLY the JSON object.`;
}
