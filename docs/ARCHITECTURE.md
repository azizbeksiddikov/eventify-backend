# Architecture

## Overview

```
Browser (eventify-client, Next.js)
        │  /graphql, /api/*
        ▼
   reverse proxy ──► api  (NestJS, :3007)
                       │            ▲
                       ▼            │ shared uploads/ volume
                    MongoDB ◄── batch (NestJS, :3008)
                                  │
                                  ├─ Puppeteer scrapers (Meetup, Luma)
                                  └─ Gemini (filter + categorize crawled events)
```

Ports (the diagram shows container ports, which are the same in both environments):

|       | Container | Prod host | Dev host |
| ----- | --------- | --------- | -------- |
| api   | 3007      | 4001      | 5001     |
| batch | 3008      | 4002      | 5002     |

One repo, one `package.json`, two Nest apps built separately (`nest build api`, `nest build batch`). Both talk to the same MongoDB and share the `uploads/` folder.

## API app (`apps/api/src`)

- **GraphQL**: Apollo, code-first (`autoSchemaFile: true`), errors formatted by `formatGraphQLError` (`libs/errors.ts`, used in `app.module.ts`) as `{ message, code, extensions: { code, params } }`. Global `ValidationPipe` and a logging interceptor. CORS open with credentials.
- **REST bits**: `GET /`, `GET /test`, `POST /upload/image`, `POST /upload/images` (multer, png/jpg/jpeg), static `/uploads`. `/llm/*` chat endpoints exist only when `NODE_ENV` is not `production`.
- **Auth**: JWT signed with the secret token. Guards: `AuthGuard` (login required), `RolesGuard` (+ `@Roles`), `WithoutGuard` (optional login). `@AuthMember()` injects the caller.

### Errors

Every error a visitor can cause has a stable **code**. The code is the key of a member in the `Message` enum (`libs/enums/common.enum.ts`); the value is the English text, kept for logs and API users.

```ts
throw new BadRequestException(errorBody('EVENT_FULL'));
throw new BadRequestException(errorBody('CURRENCY_ALREADY_EXISTS', { currency: 'USD' })); // text: "Currency {currency} already exists."
```

`errorBody` (`libs/errors.ts`) builds `{ code, message, params }`. `formatGraphQLError` sends it to the client as `extensions.code` and `extensions.params` (and the same `code` at the top level). Errors without a code (validation, framework errors) keep Nest's own code such as `BAD_REQUEST`. REST routes such as `/upload` return the same body as JSON.

The client translates by code (`errors.json` in each language), so rewording the English text is safe; renaming a code is a breaking change.

### Feature modules (`components/`)

| Module                      | Purpose                                          |
| --------------------------- | ------------------------------------------------ |
| auth, member                | signup/login, profiles, roles, points            |
| event, eventRecurrence      | events, recurrence rules and generated instances |
| group                       | groups, memberships, upcoming events             |
| ticket                      | buy tickets with points                          |
| currency                    | currencies and exchange rates (see CURRENCY.md)  |
| comment, like, follow, view | social features and counters                     |
| notification                | in-app notifications (duplicates are filtered)   |
| faq, agenda                 | FAQ entries; Agenda job queue                    |
| upload                      | image upload                                     |
| llm                         | dev-only direct Gemini chat                      |

Pattern per feature: `*.module.ts`, `*.resolver.ts`, `*.service.ts`, DTOs in `libs/dto/<feature>/` (`input`, `update`, output), enums in `libs/enums/`. Shared Mongo `$lookup` builders (member data, liked, joined, followed) live in `libs/config.ts`.

## Data model (`schemas/`)

Comment, Currency, Event, EventRecurrence, Faq, Follow, Group, GroupMember, Like, Member, Notification, Ticket, View. References are ObjectIds joined with `$lookup`; passwords and points are projected out of joined member data.

Event origin: `internal` (created in the app, sellable) or external (`meetup.com`, `luma.com`; crawled, not sold, no currency).

## Batch app (`apps/batch/src`)

Cron jobs in `batch.service.ts`, timezone `Asia/Seoul` (the client displays dates in the visitor's browser timezone):

| Schedule      | Job                                                     |
| ------------- | ------------------------------------------------------- |
| `0 0 * * *`   | generate recurring event instances                      |
| `0 1 * * *`   | member rollback                                         |
| `20 1 * * *`  | top organizers                                          |
| `0 2 * * *`   | web crawling (runs only if `WEB_CRAWLING_ENABLED=true`) |
| `0 */3 * * *` | event status cleanup                                    |

Crawling: `webCrawling.service.ts` runs the Meetup and Luma scrapers (Puppeteer + Chromium, both only present when `WEB_CRAWLING_ENABLED=true`), optionally filters/categorizes through Gemini (`llm.service.ts`, disabled when no API key), and imports events. In production the automatic crawler is off; a local refresh script is used instead (`OPERATIONS.md`).

## Cross-cutting

- Logging: `libs/logger.ts` (use it, not `console`).
- Config: `@nestjs/config` plus direct `process.env` reads. See `KEYS.md`.
- Tests: `test/*.test.ts`, node test runner via ts-node (transpile only).
