# Operations

## Crawling

- The crawling logic lives in the batch app (`apps/batch/src/components/webCrawling`: Meetup and Luma scrapers).
- `WEB_CRAWLING_ENABLED=true` would enable a 02:00 Seoul crawl on the server. The Docker image then also needs a rebuild, because Chromium is installed only when the variable is `true` at build time (compose passes it as a build arg, so it must be set in the env file that compose reads for the deploy script). Puppeteer is loaded lazily, so a disabled batch server never loads it.
- Sources: `GET /web-crawling/events?source=seoul|tashkent|online` (Seoul is the default). The search pages per source are `CRAWL_SOURCES` in `apps/batch/src/libs/config.ts`; Luma has no online page and is skipped for `online`. Scrape limits and scroll settings are in the same file.
- Crawled events are a snapshot and go stale after a few weeks. The site does not depend on them, because the recurring events below keep it full on their own.

`scripts/dev/tunnel-proxy.js` is a local reverse proxy that mimics production routing (`/api`, `/graphql`, everything else to the site).

## Recurring events

The batch app creates the events of every active recurring template on its own: a job at 00:00 Seoul time (`CRON_RECURRING_EVENTS`) fills the next 30 days. A template with no end date keeps the site full for months with nobody touching it.

- Types: `DAYS_OF_WEEK` (weekdays in `recurrenceDaysOfWeek`, 0 = Sunday), `DAY_OF_MONTH` and `INTERVAL` (every N days). Times are UTC (the container runs in UTC). The generator starts the day after the template's own `eventStartAt`.
- A template whose `recurrenceEndDate` is in the past generates nothing. Clear the end date to revive it.
- `INTERVAL` templates keep generating batch after batch: each batch continues from the template's own interval, so the weekday never drifts.
