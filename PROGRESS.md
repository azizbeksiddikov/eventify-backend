# Progress: eventify-backend

Last updated: 2026-11-01

## Status

Live and running from `master`.

## Done

- Currency is optional: free events need none, paid events require a valid one; clear errors on tickets (`docs/CURRENCY.md`).
- `getMemberPointsInCurrency` query and `npm test` runner.
- Read-only currency report script.
- Crawler can be switched off; API and batch run without `GEMINI_API_KEY`.
- Local refresh scripts in `scripts/ops`.
- Docs restructured: short README, AGENTS.md, `docs/` set.
- Error codes: every user-facing error is thrown with `errorBody(CODE)` and sent as `extensions.code` / `extensions.params`, so clients translate by code instead of matching English text (`docs/ARCHITECTURE.md`, `test/errors.test.ts`).

## Open decisions

- Keep or drop the paid-event currency safeguard (`docs/CURRENCY.md`).
- Re-enable the server crawler, or keep the local refresh.
