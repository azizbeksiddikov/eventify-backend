import { CrawledEvent } from '@app/api/src/libs/dto/event/eventCrawling';

/**
 * Build safety check prompt - extremely minimal filtering
 */
export function buildSafetyCheckPrompt(event: CrawledEvent): string {
	const desc = event.eventDesc || 'N/A';
	const name = event.eventName || 'N/A';
	return `Evaluate if this event is appropriate for a public community event platform.

EVENT: ${name}
DESCRIPTION: ${desc}

RESTRICTED TOPICS - Mark as UNSAFE if the event:

1. SEXUAL SERVICES / ADULT CONTENT
   Keywords: escort, prostitution, sexual services, adult entertainment, strip club, gentlemen's club, massage parlor (suspicious context), erotic, XXX
   Exception: Dating events, singles mixers, speed dating are SAFE

2. ILLEGAL DRUGS
   Keywords: cocaine, heroin, meth, MDMA, ecstasy, molly, drug dealing, illegal substances
   Exception: Cannabis/marijuana events in legal jurisdictions are SAFE

3. PYRAMID SCHEMES / SCAMS
   Keywords: MLM, multi-level marketing, get rich quick, pyramid scheme, ponzi, investment opportunity (suspicious), guaranteed returns, work from home opportunity (suspicious)

4. VIOLENCE / HATE
   Keywords: nazi, white supremacy, hate group, violent protest, terrorism, extremist, racial violence
   Exception: Political protests, activism, and legitimate political gatherings are SAFE

5. CHILD ENDANGERMENT
   Any event that inappropriately targets minors or puts children at risk

6. GAMBLING (Illegal Operations)
   Keywords: underground casino, illegal betting, unlicensed gambling
   Exception: Licensed casinos, legal poker nights, charity raffles are SAFE

7. WEAPONS (Illegal Context)
   Keywords: illegal firearms, weapons dealing, unregistered weapons
   Exception: Licensed gun ranges, legal hunting events, self-defense classes are SAFE

SAFE EVENTS (DO NOT REJECT):
- Bars, nightlife, social drinking, alcohol events
- Dating events, singles mixers, speed dating, social gatherings
- House parties, social gatherings, meetups, networking
- Language practice, conversation clubs, educational events
- Protests, political gatherings, activism, demonstrations
- Cannabis/marijuana events (legal jurisdictions)
- Adult-oriented but legal entertainment (burlesque, comedy shows)
- Licensed casinos, poker nights, betting events
- Gun ranges, hunting events, self-defense classes
- Any legitimate professional, educational, or community event

DECISION PROCESS:
1. Check if event name or description contains RESTRICTED keywords in suspicious context
2. If no clear red flags found → Mark as SAFE
3. If uncertain or seems like a normal gathering → Mark as SAFE
4. Only mark UNSAFE if you have strong evidence of illegal/harmful activity

IMPORTANT: Most normal social, educational, entertainment, and community events should be marked as SAFE.
When in doubt, mark as SAFE.

OUTPUT (valid JSON only, no markdown):
{"safe": true, "reason": ""}
OR
{"safe": false, "reason": "brief specific reason"}

Use empty string for reason when safe=true.`;
}

export function fillEventDataPrompt(event: CrawledEvent): string {
	const desc = event.eventDesc || 'N/A';
	const name = event.eventName || 'N/A';
	const existingTags = event.eventTags && event.eventTags.length > 0 ? event.eventTags.join(', ') : 'NONE';
	return `You are an expert event categorizer. Analyze this event and categorize it accurately.

EVENT NAME: ${name}
DESCRIPTION: ${desc}
EXISTING TAGS: ${existingTags}

TASK:
1. Identify the PRIMARY activity/purpose of the event
2. Select 1-2 most relevant categories (max 2)
3. Generate or enhance tags (specific, lowercase, relevant)

AVAILABLE CATEGORIES:
TECHNOLOGY, BUSINESS, SPORTS, ART, EDUCATION, FOOD, HEALTH, ENTERTAINMENT, TRAVEL, POLITICS, RELIGION, OTHER

CATEGORY SELECTION GUIDE:

TECHNOLOGY - Software, hardware, AI, programming, tech products, developer meetups
→ "React Workshop", "AI Conference", "Blockchain Meetup"

BUSINESS - Networking, entrepreneurship, startups, professional development, career
→ "Startup Pitch Night", "Entrepreneurs Meetup", "Professional Networking"

SPORTS - Team sports, competitions, athletic activities, games
→ "Football Match", "Basketball Tournament", "Tennis Clinic"

HEALTH - Fitness, wellness, yoga, meditation, mental health
→ "Yoga Class", "Meditation Session", "Wellness Workshop"

EDUCATION - Learning, teaching, workshops, language practice, academic
→ "English Conversation", "Language Exchange", "Python Course", "History Lecture"

FOOD - Cooking, dining, tastings, culinary workshops (food must be the PRIMARY focus)
→ "Cooking Class", "Wine Tasting", "Food Tour", "Baking Workshop"

ENTERTAINMENT - Concerts, shows, movies, performances, parties
→ "Live Music", "Comedy Show", "Film Screening"

SPORTS/HEALTH/TRAVEL - Hiking, walking, running, outdoor adventures
→ "Mountain Hike", "Park Walk", "Running Club", "Nature Trail"

ART - Visual arts, music creation, theater, creative workshops
→ "Painting Class", "Gallery Opening", "Theater Production"

COMMON PATTERNS:
- Language/conversation events → EDUCATION (not FOOD)
- Social networking events → BUSINESS (not FOOD)
- Physical outdoor activities → SPORTS, HEALTH, or TRAVEL (not TECHNOLOGY)
- Hiking/walking/running → SPORTS or HEALTH (not TECHNOLOGY)

TAGS RULES:
- If existing tags provided: KEEP ALL + add 2-3 more relevant tags
- If no existing tags: create 3-5 specific, descriptive tags
- Use lowercase only
- Be specific and relevant to the event
- NEVER reduce the number of existing tags

EXAMPLES:

"English Speaking Club" → {"categories":["EDUCATION"],"tags":["language","english","speaking","conversation","learning"]}
Reason: Language practice is educational

"Tech Entrepreneurs Networking" → {"categories":["TECHNOLOGY","BUSINESS"],"tags":["networking","startups","tech","entrepreneurs","business"]}
Reason: Combines tech industry with business networking

"Sunset Hiking Group" → {"categories":["SPORTS","HEALTH"],"tags":["hiking","outdoor","nature","fitness","wellness"]}
Reason: Physical outdoor activity

"Italian Cooking Masterclass" → {"categories":["FOOD","EDUCATION"],"tags":["cooking","italian","culinary","workshop","food"]}
Reason: Food preparation as primary activity + educational format

"Morning Yoga in the Park" → {"categories":["HEALTH","SPORTS"],"tags":["yoga","wellness","outdoor","fitness","exercise"]}
Reason: Wellness/fitness focused activity

OUTPUT FORMAT (JSON only, no markdown, no backticks):
{"categories":["CATEGORY1","CATEGORY2"],"tags":["tag1","tag2","tag3","tag4","tag5"]}`;
}