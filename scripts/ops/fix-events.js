// After a crawl: fills missing categories/tags with keyword rules (no Gemini needed)
// and fixes Luma prices using Luma's own is_free flag.
// Run from eventify-backend/: node scripts/ops/fix-events.js
const path = require("path");
require(path.join(process.cwd(), "node_modules", "dotenv")).config({ quiet: true });
const mongoose = require(path.join(process.cwd(), "node_modules", "mongoose"));

// First match wins the first slot; up to 2 categories per event.
const RULES = [
	["TECHNOLOGY", /\b(ai|llm|rag|mcp|aws|cloud|devops|software|developer|dev ?day|data|security|owasp|cyber|tech|coding|programming|web3|blockchain|bitcoin|engineering)\b/i],
	["BUSINESS", /\b(startup|business|venture|investor|founder|commerce|marketing|pitch|entrepreneur|career|networking night)\b/i],
	["EDUCATION", /(language exchange|언어교환|english|korean|japanese|chinese|spanish|study|workshop|lecture|learn|class|practice)/i],
	["SPORTS", /\b(hike|hiking|climb|climbing|run|running|fitness|yoga|cycling|bicycl|soccer|football|tennis|badminton|weightlift|workout|bukhansan)\b/i],
	["FOOD", /\b(food|dinner|lunch|brunch|restaurant|dine|cooking|bbq|meat|coffee|wine|tasting)\b|닭|고깃집/i],
	["ART", /\b(art|design|writing|music|photo|photography|film|painting|drawing|craft|content)\b/i],
	["HEALTH", /\b(health|mental|wellness|meditation|menopause|hormone)\b/i],
	["RELIGION", /\b(buddhis|church|bible|temple|prayer|religio)/i],
	["TRAVEL", /\b(travel|trip|tour|walk|sunset|rooftop|explore)\b/i],
	["ENTERTAINMENT", /\b(party|board ?games?|games?|halloween|karaoke|pub|drinks|night|costume|movie|concert)\b/i],
	["CULTURE", /\b(culture|cultural|tradition|k-?pop|hanbok|museum|heritage)\b/i],
	["COMMUNITY", /\b(social|friends|meetup|community|expat|volunteer|homeless|mingl)/i],
];

function categorize(e) {
	// Title decides first, then Meetup topics, then the description only fills gaps
	const cats = [];
	for (const text of [e.eventName, (e.eventTags || []).join(" "), (e.eventDesc || "").slice(0, 600)]) {
		for (const [cat, re] of RULES) if (cats.length < 2 && re.test(text) && !cats.includes(cat)) cats.push(cat);
	}
	if (!cats.length) cats.push("COMMUNITY");
	return cats.slice(0, 2);
}

(async () => {
	await mongoose.connect(process.env.MONGODB_URI);
	const events = mongoose.connection.db.collection("events");
	const upcoming = await events.find({ eventStartAt: { $gt: new Date() } }).toArray();
	if (process.argv.includes("--compare")) {
		// Read-only: show rule output next to the categories already stored
		let same = 0;
		for (const e of upcoming) {
			const rule = categorize(e), cur = e.eventCategories || [];
			if (rule.some((c) => cur.includes(c))) same++;
			else console.log(`  differ: ${e.eventName.slice(0, 55)} | stored ${cur} | rules ${rule}`);
		}
		console.log(`${same}/${upcoming.length} share at least one category with the stored ones`);
		return mongoose.disconnect();
	}
	let cats = 0, prices = 0, tags = 0;
	for (const e of upcoming) {
		const set = {};
		if (!e.eventCategories || !e.eventCategories.length) { set.eventCategories = categorize(e); cats++; }
		if (e.origin === "luma.com") {
			if (!e.eventTags || !e.eventTags.length) {
				set.eventTags = (set.eventCategories || e.eventCategories || []).map((c) => c.toLowerCase()).concat(["luma", "seoul"]);
				tags++;
			}
			if (e.eventPrice) {
				try {
					const slug = String(e.externalUrl || "").split("/").pop();
					const r = await fetch("https://api.lu.ma/url?url=" + encodeURIComponent(slug)).then((r) => r.json());
					if (r?.data?.ticket_info?.is_free === true) { set.eventPrice = 0; prices++; }
				} catch { /* keep scraper price */ }
			}
		}
		if (Object.keys(set).length) await events.updateOne({ _id: e._id }, { $set: set });
	}
	console.log(`upcoming ${upcoming.length}: categories set ${cats}, luma prices fixed ${prices}, luma tags set ${tags}`);
	await mongoose.disconnect();
})();
