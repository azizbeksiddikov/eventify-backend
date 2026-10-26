# Currencies, event currency and points

## Model
- `currencies` collection: `{ currencyCode, exchangeRate, isActive }`. `exchangeRate` is **points per 1 unit of currency** (USD = 10 means 1 USD = 10 points). Ticket price in points = `eventPrice * quantity * exchangeRate`.
- `getMemberPointsInCurrency(currencyCode: String!): Float` (login required): the caller's points divided by the rate, rounded to 2 decimals (profile header).

## Currency is optional (owner decision 2026-10-26)
- Free event (price 0 or empty): no currency needed anywhere. Create/update accept none and store none; ticket purchase skips every currency check and conversion (cost 0, the ticket stores no currency); the UI shows "Free".
- Paid event (price > 0): a currency is required and must exist in `currencies`. Create/update reject a missing one ("Choose a currency for a paid event.") or an unknown one ("This currency is not supported."). A legacy paid event with no currency cannot sell tickets: the purchase stops with "This paid event has no currency set, so a ticket cannot be priced. Please contact the organizer." (the price is never guessed in another currency).
- Crawled events (`origin` other than `internal`) are not sold in the app and need no currency.
- Safeguard for paid events is the agent's choice for the owner to veto: remove `EVENT_CURRENCY_REQUIRED` handling in `CurrencyService.resolveEventCurrency` to drop it.

## Report script (read-only)
`scripts/ops/report-event-currency.js` counts events without a currency and lists internal paid events that still have none (the only ones with a problem). It never writes, loads no dotenv file and never prints the connection string.
```
MONGODB_URI=mongodb://127.0.0.1:27018/EventifyDev node scripts/ops/report-event-currency.js
```
EventifyDev, 2026-10-26: 813 events; 552 without currency, all external (52 luma.com + 500 meetup.com); 0 internal free; 0 internal paid without currency; 1 paid event uses `EUR`, which is not in `currencies`. Production (owner to run, read-only): same command with the production connection string exported in that shell. No backfill is needed.

## Tests
`npm test` runs `test/*.test.ts` (node test runner, ts-node transpile-only, tsconfig-paths).
