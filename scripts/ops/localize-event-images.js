// Downloads full-resolution cover images of upcoming crawled events into <images dir>/uploads/event/,
// records them in <images dir>/manifest.json, and (with --apply) points the events at the local copies.
//
// Run from eventify-backend/ (uses its .env + node_modules):
// Images dir: EVENT_IMAGES_DIR, default ../sample-images (outside the repo).
//   node scripts/ops/localize-event-images.js            # download only, dry run
//   node scripts/ops/localize-event-images.js --apply    # also update eventImages in MongoDB
// Then upload: rsync -a ../sample-images/uploads/event/ vps:/opt/apps/eventify-backend/uploads/event/
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
require(path.join(process.cwd(), "node_modules", "dotenv")).config({ quiet: true });
const mongoose = require(path.join(process.cwd(), "node_modules", "mongoose"));

const ROOT = process.env.EVENT_IMAGES_DIR || path.resolve(process.cwd(), "../sample-images");
const OUT = path.join(ROOT, "uploads", "event");
const MANIFEST = path.join(ROOT, "manifest.json");
const APPLY = process.argv.includes("--apply");
// Crawled (non-internal) events are shown by the client exactly as stored, so they need a full URL.
const PUBLIC = "https://eventify.azbek.me/api/";
const EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif", "image/gif": "gif" };

// Rewrite CDN thumbnail URLs to the original upload.
function fullRes(url) {
	// Luma: https://images.lumacdn.com/cdn-cgi/image/width=400,.../event-covers/xx/uuid.png -> original
	url = url.replace(/images\.lumacdn\.com\/cdn-cgi\/image\/[^/]+\//, "images.lumacdn.com/");
	// Meetup: .../photos/event/a/b/c/600_123.jpeg -> highres_123.jpeg
	url = url.replace(/\/(?:\d+x\d+_|\d+_|thumb_|global_|member_)(\d+\.(?:jpe?g|png|webp))/, "/highres_$1");
	return url;
}

async function download(url) {
	const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
	if (!r.ok) throw new Error(`HTTP ${r.status}`);
	const type = (r.headers.get("content-type") || "").split(";")[0];
	if (!EXT[type]) throw new Error(`not an image: ${type}`);
	return { buf: Buffer.from(await r.arrayBuffer()), ext: EXT[type] };
}

(async () => {
	fs.mkdirSync(OUT, { recursive: true });
	const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, "utf8")) : {};
	await mongoose.connect(process.env.MONGODB_URI);
	const events = mongoose.connection.db.collection("events");
	const list = await events
		.find({ eventStartAt: { $gt: new Date() }, eventImages: { $elemMatch: { $regex: "^https?://(?!eventify\\.azbek\\.me/)" } } })
		.toArray();
	console.log(`${list.length} upcoming events with remote images`);

	let done = 0, failed = 0, bytes = 0;
	for (const ev of list) {
		const newImages = [];
		for (const src of ev.eventImages) {
			if (!/^https?:\/\//.test(src) || src.startsWith(PUBLIC)) { newImages.push(src); continue; }
			const known = Object.entries(manifest).find(([, m]) => m.source === src);
			if (known && fs.existsSync(path.join(ROOT, known[0]))) { newImages.push(PUBLIC + known[0]); continue; }
			try {
				let got, used = fullRes(src);
				try { got = await download(used); } catch { used = src; got = await download(src); }
				const rel = `uploads/event/${crypto.randomUUID()}.${got.ext}`;
				fs.writeFileSync(path.join(ROOT, rel), got.buf);
				manifest[rel] = { source: src, downloadedFrom: used, eventId: String(ev._id), eventName: ev.eventName, externalUrl: ev.externalUrl, bytes: got.buf.length };
				newImages.push(PUBLIC + rel); bytes += got.buf.length; done++;
			} catch (e) {
				console.log(`  FAIL ${ev.eventName}: ${e.message}`); failed++; newImages.push(src);
			}
		}
		if (APPLY) await events.updateOne({ _id: ev._id }, { $set: { eventImages: newImages } });
	}
	fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
	console.log(`downloaded ${done} (${(bytes / 1e6).toFixed(1)} MB), failed ${failed}, ${APPLY ? "DB updated" : "dry run, DB not changed"}`);
	await mongoose.disconnect();
})();
