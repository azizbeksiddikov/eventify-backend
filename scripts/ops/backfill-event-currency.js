// Gives internal events that have no currency the default currency (the oldest active
// currency in the `currencies` collection), so tickets can always be priced.
// Crawled/external events (origin other than "internal") are never touched: they do not
// sell tickets in the app.
//
// Dry run (default, writes nothing):
//   MONGODB_URI=... node scripts/ops/backfill-event-currency.js
// Write:
//   MONGODB_URI=... node scripts/ops/backfill-event-currency.js --apply --confirm-db <DatabaseName>
//
// MONGODB_URI must be exported in the shell: this script does not load any dotenv file and
// never prints the connection string. --apply is refused unless --confirm-db matches the
// name of the database you are actually connected to, so a wrong URI cannot be written to
// by accident. Safe to run twice: it only matches events that still have no currency.
const path = require("path");
const mongoose = require(path.join(process.cwd(), "node_modules", "mongoose"));

const MISSING = [{ eventCurrency: null }, { eventCurrency: "" }, { eventCurrency: { $exists: false } }];
const INTERNAL = [{ origin: "internal" }, { origin: null }, { origin: { $exists: false } }];

async function counts(events) {
	const missing = { $or: MISSING };
	return {
		total: await events.countDocuments({}),
		missingCurrencyAll: await events.countDocuments(missing),
		missingCurrencyInternal: await events.countDocuments({ $and: [missing, { $or: INTERNAL }] }),
		missingCurrencyExternal: await events.countDocuments({ $and: [missing, { $nor: INTERNAL }] }),
		paidWithoutCurrency: await events.countDocuments({ $and: [missing, { eventPrice: { $gt: 0 } }] }),
	};
}

(async () => {
	const uri = process.env.MONGODB_URI;
	if (!uri) {
		console.error("MONGODB_URI is not set in the environment.");
		process.exit(1);
	}
	const apply = process.argv.includes("--apply");
	const confirmIdx = process.argv.indexOf("--confirm-db");
	const confirmDb = confirmIdx > -1 ? process.argv[confirmIdx + 1] : undefined;

	await mongoose.connect(uri);
	const db = mongoose.connection.db;
	const dbName = db.databaseName;
	const events = db.collection("events");
	console.log(`Database: ${dbName}`);
	console.log(`Mode: ${apply ? "APPLY (writes)" : "dry run (no writes)"}`);

	const before = await counts(events);
	console.log("Before:", before);

	const def = await db.collection("currencies").find({ isActive: true }).sort({ createdAt: 1 }).limit(1).next();
	if (!def) {
		console.error("No active currency found; nothing can be filled in.");
		await mongoose.disconnect();
		process.exit(1);
	}
	console.log(`Default currency: ${def.currencyCode}`);

	// Report (never change) events whose currency is not in the currencies collection.
	const known = (await db.collection("currencies").find({}).toArray()).map((c) => c.currencyCode);
	const unknown = await events
		.aggregate([
			{ $match: { eventCurrency: { $nin: [null, "", ...known] } } },
			{ $group: { _id: "$eventCurrency", n: { $sum: 1 } } },
		])
		.toArray();
	if (unknown.length) console.log("Events with a currency that is not in `currencies` (left as is):", unknown);

	const filter = { $and: [{ $or: MISSING }, { $or: INTERNAL }] };
	const toFix = await events.countDocuments(filter);
	console.log(`Internal events to fill with ${def.currencyCode}: ${toFix}`);

	if (apply) {
		if (confirmDb !== dbName) {
			console.error(`Refusing to write: pass --confirm-db ${dbName} to confirm this is the right database.`);
			await mongoose.disconnect();
			process.exit(1);
		}
		const res = await events.updateMany(filter, { $set: { eventCurrency: def.currencyCode } });
		console.log(`Updated: ${res.modifiedCount}`);
		console.log("After:", await counts(events));
	} else {
		console.log(`Dry run: nothing written. Re-run with --apply --confirm-db ${dbName} to write.`);
	}
	await mongoose.disconnect();
})().catch((e) => {
	console.error("Failed:", e.message);
	process.exit(1);
});
