# Currencies, event currency and points

## Model
- `currencies` collection: `{ currencyCode, exchangeRate, isActive }`. `exchangeRate` is **points per 1 unit of currency** (USD = 10 means 1 USD = 10 points). Ticket price in points = `eventPrice * quantity * exchangeRate`.
- `getMemberPointsInCurrency(currencyCode: String!): Float` (login required): the caller's points divided by the rate, rounded to 2 decimals (profile header).

## Currency is optional
- Free event (price 0 or empty): no currency needed anywhere. Create/update accept none and store none; ticket purchase skips every currency check and conversion (cost 0, the ticket stores no currency); the UI shows "Free".
- Paid event (price > 0): a currency is required and must exist in `currencies`. Create/update reject a missing one ("Choose a currency for a paid event.") or an unknown one ("This currency is not supported."). A legacy paid event with no currency cannot sell tickets: the purchase stops with "This paid event has no currency set, so a ticket cannot be priced. Please contact the organizer." (the price is never guessed in another currency).
- Crawled events (`origin` other than `internal`) are not sold in the app and need no currency.
- The paid-event safeguard is a deliberate rule (`EVENT_CURRENCY_REQUIRED` in `CurrencyService.resolveEventCurrency`): a price always has a known currency, so the points cost can always be computed.
## Tests
`npm test` runs `test/*.test.ts` (node test runner, ts-node transpile-only, tsconfig-paths).
