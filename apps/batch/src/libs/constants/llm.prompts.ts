import { CrawledEvent } from '@app/api/src/libs/dto/event/eventCrawling';

/**
 * Build safety check prompt - extremely minimal filtering
 */
export function buildSafetyCheckPrompt(event: CrawledEvent): string {
	const desc = event.eventDesc || 'N/A';
	const name = event.eventName || 'N/A';
	return `Is this event safe for a public platform?

Event: ${name}
Description: ${desc}

Mark UNSAFE only if it involves:
- Illegal drugs (cocaine, heroin, meth)
- Sexual services (escort, prostitution)
- Violence or hate groups
- Scams or pyramid schemes

Most events are SAFE. When uncertain, respond SAFE.

Respond with JSON only:
{"safe": true, "reason": ""}`;
}

export function fillEventDataPrompt(event: CrawledEvent): string {
	const desc = event.eventDesc || 'N/A';
	const name = event.eventName || 'N/A';
	const existingTags = event.eventTags && event.eventTags.length > 0 ? event.eventTags.join(', ') : 'NONE';
	return `Categorize this event.

EVENT: ${name}
DESCRIPTION: ${desc}
EXISTING TAGS: ${existingTags}

⚠️ CATEGORIES MUST BE FROM THIS LIST ONLY:
EDUCATION, TECHNOLOGY, BUSINESS, SPORTS, HEALTH, FOOD, ART, ENTERTAINMENT, TRAVEL, CULTURE, COMMUNITY, POLITICS, RELIGION, OTHER

DO NOT invent new categories! Only use the exact words above.

⚠️ KEYWORD MATCHING RULES - CHECK IN THIS ORDER:

STEP 1: Check for TECHNOLOGY keywords (if found → TECHNOLOGY):
- Keywords: AI, artificial intelligence, machine learning, ML, web3, blockchain, crypto
- Keywords: security, cybersecurity, OWASP, infosec, application security
- Keywords: coding, programming, software, developer, tech, startup tech
- Keywords: IT, computer, digital, data, cloud, API
- Example: "AI Security" → TECHNOLOGY
- Example: "OWASP Seoul" → TECHNOLOGY
- Example: "Web3 Builders" → TECHNOLOGY

STEP 2: Check for EDUCATION keywords (if found → EDUCATION):
- Keywords: language exchange, conversation club, speaking practice
- Keywords: 언어 교환, language learning, English/Korean exchange
- Keywords: class, workshop, seminar, lecture, course, training
- Keywords: learning, teach, study, education
- Example: "Language Exchange" → EDUCATION
- Example: "Korean Conversation" → EDUCATION
- Example: "Eng&Kor Language Exchange" → EDUCATION

STEP 3: Check for CULTURE keywords (if found → CULTURE):
- Keywords: dance (salsa, cuban, traditional), dancing
- Keywords: cultural, heritage, tradition, traditional
- Keywords: culture exchange, cultural exchange
- Keywords: craft, stamp making, art craft
- Example: "Cuban Salsa Dance" → CULTURE
- Example: "Korean Name Stamp" → CULTURE
- Example: "Traditional Dance" → CULTURE

STEP 4: Check for BUSINESS keywords:
- Keywords: networking, business, startup, entrepreneur, investment
- Keywords: career, professional, recruiting, job
- Example: "Startup Networking" → BUSINESS

STEP 5: Check for other specific categories:
- SPORTS: fitness, gym, sports, exercise, running, yoga
- HEALTH: wellness, health, meditation, mental health
- FOOD: food, cooking, restaurant, dining, culinary
- ART: art, painting, drawing, creative, gallery
- ENTERTAINMENT: concert, show, performance, music concert
- TRAVEL: travel, trip, tour, tourism
- COMMUNITY: meetup, social gathering (ONLY if no other category matches)

STEP 6: If NOTHING matches → OTHER

⚠️ MULTIPLE CATEGORIES (max 2):
You can select TWO categories if event clearly matches TWO types:
- "Language + Cultural Exchange" → ["EDUCATION","CULTURE"]
- "Tech Networking Event" → ["TECHNOLOGY","BUSINESS"]
- "Salsa Dance Class" → ["CULTURE"] (just one is fine)
BUT: If event has ONE clear primary category, use ONLY ONE category.

⚠️ EXAMPLES - FOLLOW THESE EXACTLY:

EVENT: "OWASP Seoul Chapter: AI 보안의 현재와 미래"
TAGS: Application Security, Cybersecurity
→ {"categories":["TECHNOLOGY"],"tags":["application security","cybersecurity","ai","security","owasp"]}
WHY: Contains "AI", "security", "OWASP" → TECHNOLOGY

EVENT: "[합정]Eng&Kor Language Exchange in Seoul"
TAGS: Language Exchange, Korean & English Language Exchange
→ {"categories":["EDUCATION","CULTURE"],"tags":["language exchange","korean & english language exchange","language","culture exchange","korean"]}
WHY: Contains "Language Exchange" → EDUCATION, also cultural aspect → add CULTURE

EVENT: "Cuban Salsa Dance Class"
TAGS: International Friends, Language & Culture
→ {"categories":["CULTURE"],"tags":["international friends","language & culture","salsa","dance","cuban"]}
WHY: Contains "Dance" → CULTURE

EVENT: "Open Source Web3 × AI Builders Night"
TAGS: (none)
→ {"categories":["TECHNOLOGY"],"tags":["web3","ai","blockchain","tech","opensource"]}
WHY: Contains "Web3", "AI" → TECHNOLOGY

EVENT: "Korean Conversation Club"
→ {"categories":["EDUCATION"],"tags":["korean","language","conversation"]}
WHY: Contains "Conversation" → EDUCATION

EVENT: "Startup Networking Meetup"
→ {"categories":["BUSINESS"],"tags":["startup","networking","business"]}
WHY: Contains "Networking", "Startup" → BUSINESS

⚠️ TAGS RULES:
1. ALWAYS keep ALL existing tags (from EXISTING TAGS above)
2. Add 2-3 NEW lowercase tags based on event name/description
3. If NO existing tags: generate 3-5 relevant tags
4. Tags can be any words, any language (English, Korean, etc)
5. Make tags specific and relevant to the event

⚠️ OUTPUT FORMAT - CRITICAL:
1. NO markdown (no code blocks)
2. MUST use ARRAYS with square brackets []
3. Output ONLY the JSON, nothing else

CORRECT OUTPUT:
{"categories":["EDUCATION"],"tags":["tag1","tag2","tag3"]}

WRONG OUTPUTS (DO NOT DO THIS):
{"categories":"EDUCATION","tags":"tag1, tag2"}  ← categories must be array
{"categories":["EDUCATION"],"tags":"tag1, tag2"}  ← tags must be array
Code blocks with json are WRONG - output raw JSON only

⚠️ FINAL REMINDER:
1. Check keywords: AI/security/web3 → TECHNOLOGY, language/conversation → EDUCATION, dance → CULTURE
2. Keep ALL existing tags
3. Output pure JSON with arrays
4. No markdown, no code blocks, no extra text`;
}
