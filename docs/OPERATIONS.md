# Operations

## Crawling and weekly refresh

- The server's automatic crawler is **off** (`WEB_CRAWLING_ENABLED` unset). Set it to `true` to enable the 02:00 Seoul job; the Docker image then also needs a rebuild, because Chromium is installed only when the variable is `true` at build time (compose passes it as a build arg, so it must be set in the env file that compose reads for the deploy script). Puppeteer is loaded lazily, so a disabled batch server never loads it. The local refresh script does not need the variable.
- Instead, `scripts/ops/refresh.sh` runs the crawler locally, fixes categories/prices, saves full-resolution images and uploads them to the server. It only runs when the last success is 7+ days old; `--force` runs it now.
- Seoul is the target city (Meetup and Luma). Scrape limits and scroll settings are in `apps/batch/src/libs/config.ts`.

## Scripts (`scripts/ops`)

| Script                     | Purpose                                                                                                  |
| -------------------------- | -------------------------------------------------------------------------------------------------------- |
| `refresh.sh`               | the weekly refresh described above                                                                       |
| `fix-events.js`            | after a crawl: fill missing categories/tags by keyword rules (no Gemini), fix Luma prices from `is_free` |
| `localize-event-images.js` | download remote event images into `uploads/`                                                             |
| `report-event-currency.js` | read-only report of events missing a currency (see CURRENCY.md)                                          |

Script rules (dry-run by default, no env files, try on `EventifyDev` first) are in AGENTS.md.

`scripts/dev/tunnel-proxy.js` is a local reverse proxy that mimics production routing (`/api`, `/graphql`, everything else to the site).

## Local database

`EventifyDev` is a disposable local MongoDB for trying scripts and data changes. Production is `EventifyProd`; never mix them.

## Troubleshooting

- API exits at start: `PORT_API` or `MONGODB_URI` missing (KEYS.md).
- No LLM output: `GEMINI_API_KEY` not set; crawler still imports, without AI filtering.
- Scraper cannot launch a browser: check `PUPPETEER_EXECUTABLE_PATH` points to an installed Chromium.
- Images missing after deploy: the `uploads/` volume must be mounted and not overwritten by rsync.
- Internal event image 404s: `uploads/` holds the only copy of images uploaded in the app. Back it up before rebuilding or moving the server.
