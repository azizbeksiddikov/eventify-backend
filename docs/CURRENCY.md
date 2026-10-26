# Currencies, event currency and points

## How it works
- `currencies` collection: `{ currencyCode, exchangeRate, isActive }`. `exchangeRate` is **points per 1 unit of currency** (USD = 10 means 1 USD = 10 points). Ticket price in points = `eventPrice * quantity * exchangeRate`.
- Default currency = the oldest active currency (`CurrencyService.getDefaultCurrencyCode`).
- `getMemberPointsInCurrency(currencyCode: String!): Float` (login required): the caller's points divided by the rate, rounded to 2 decimals. The client profile header uses it.

## Rules (CurrencyService.resolveEventCurrency)
- Creating or updating an event: a named currency must exist in `currencies` (otherwise "This currency is not supported."); no currency means the default one is stored, free or paid.
- Buying a ticket: a free event costs 0 points and needs no rate (the default currency is stamped on the ticket if the event has none). A paid event with no currency uses the default; if no currency is configured at all the purchase fails with "No currency is configured yet. Please contact support."
- Crawled events (`origin` other than `internal`) are not sold in the app and keep no currency.

## Backfill script (existing data)
`scripts/ops/backfill-event-currency.js` fills the default currency on **internal** events that have none. Dry run by default, idempotent, prints counts only (never the connection string), `--apply` also needs `--confirm-db <name>` equal to the connected database name. It does not load any dotenv file; `MONGODB_URI` must be set in the shell.

Local (EventifyDev), already run on 2026-10-26:
```
MONGODB_URI=mongodb://127.0.0.1:27018/EventifyDev node scripts/ops/backfill-event-currency.js
MONGODB_URI=mongodb://127.0.0.1:27018/EventifyDev node scripts/ops/backfill-event-currency.js --apply --confirm-db EventifyDev
```
Result on EventifyDev: 813 events, 555 without currency = 3 internal (filled with USD) + 552 external (52 luma.com, 500 meetup.com; left alone). 0 paid events lacked a currency. One event uses `EUR`, which is not in `currencies`; it is reported, not changed.

**Production (owner to approve and run; not run by the agent).** On the server, from the backend folder, with the production connection string exported in that shell (database `EventifyProd`):
```
node scripts/ops/backfill-event-currency.js                                   # dry run first, check the counts
node scripts/ops/backfill-event-currency.js --apply --confirm-db EventifyProd # then write
```
Take a backup before `--apply`. Deploy the backend first so new events get a currency too.

## Tests
`npm test` runs `test/*.test.ts` with node's test runner (ts-node, transpile-only, tsconfig-paths).
