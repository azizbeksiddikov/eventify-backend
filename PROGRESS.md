# Progress: eventify-backend

Last updated: 2026-11-01

## Status

Live and running from `master`.

## Done

- Ports unified: prod 4001/4002, dev 4101/4102, local 4201/4202; container port equals host port, set by `PORT_API` / `PORT_BATCH` in the compose files (`docs/ARCHITECTURE.md`).
- Currency is optional: free events need none, paid events require a valid one; clear errors on tickets (`docs/CURRENCY.md`).
- `getMemberPointsInCurrency` query and `npm test` runner.
- Read-only currency report script.
- With `WEB_CRAWLING_ENABLED` not `true`, the Docker build skips Chromium and the batch app does not load Puppeteer (lazy import in `libs/browser.ts`); faster builds and lower memory.
- Crawler can be switched off; API and batch run without `GEMINI_API_KEY`.
- Local refresh scripts in `scripts/ops`.
- Docs restructured: short README, AGENTS.md, `docs/` set.
- Error codes: every user-facing error is thrown with `errorBody(CODE)` and sent as `extensions.code` / `extensions.params`, so clients translate by code instead of matching English text (`docs/ARCHITECTURE.md`, `test/errors.test.ts`).

## Open decisions

- Keep or drop the paid-event currency safeguard (`docs/CURRENCY.md`).
- Re-enable the server crawler, or keep the local refresh.
