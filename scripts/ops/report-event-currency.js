// Read-only report: which internal events still have a currency problem?
// Only a PAID event (eventPrice > 0) with no currency cannot sell tickets. Free events
// and crawled/external events need no currency, so they are only counted.
//
//   MONGODB_URI=... node scripts/ops/report-event-currency.js
//
// Never writes. MONGODB_URI must be exported in the shell (no dotenv file is loaded) and is
// never printed.
const path = require("path");
const mongoose = require(path.join(process.cwd(), "node_modules", "mongoose"));

const MISSING = [{ eventCurrency: null }, { eventCurrency: "" }, { eventCurrency: { $exists: false } }];
const INTERNAL = [{ origin: "internal" }, { origin: null }, { origin: { $exists: false } }];

(async () => {
	if (!process.env.MONGODB_URI) {
		console.error("MONGODB_URI is not set in the environment.");
		process.exit(1);
	}
	await mongoose.connect(process.env.MONGODB_URI);
	const db = mongoose.connection.db;
	const events = db.collection("events");
	const missing = { $or: MISSING };
	const internal = { $or: INTERNAL };
	console.log(`Database: ${db.databaseName} (read-only)`);
	console.log({
		total: await events.countDocuments({}),
		missingCurrencyAll: await events.countDocuments(missing),
		missingCurrencyInternalFree: await events.countDocuments({ $and: [missing, internal, { eventPrice: { $not: { $gt: 0 } } }] }),
		missingCurrencyExternal: await events.countDocuments({ $and: [missing, { $nor: INTERNAL }] }),
		internalPaidWithoutCurrency: await events.countDocuments({ $and: [missing, internal, { eventPrice: { $gt: 0 } }] }),
	});
	const known = (await db.collection("currencies").find({}).toArray()).map((c) => c.currencyCode);
	const unknown = await events
		.aggregate([
			{ $match: { eventCurrency: { $nin: [null, "", ...known] }, eventPrice: { $gt: 0 } } },
			{ $group: { _id: "$eventCurrency", n: { $sum: 1 } } },
		])
		.toArray();
	console.log("Paid events whose currency is not in `currencies`:", unknown);
	const problem = await events
		.find({ $and: [missing, internal, { eventPrice: { $gt: 0 } }] }, { projection: { _id: 1, eventName: 1, eventPrice: 1 } })
		.toArray();
	console.log(`Internal paid events with no currency (${problem.length}):`);
	problem.forEach((e) => console.log(`  ${e._id} price=${e.eventPrice} ${String(e.eventName).slice(0, 50)}`));
	await mongoose.disconnect();
})().catch((e) => {
	console.error("Failed:", e.message);
	process.exit(1);
});
