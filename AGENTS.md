# AGENTS.md: eventify-backend

Rules for any AI agent in this repo.
## Hard rules

- **Never read, print, edit or search inside env files** that can hold real values (`.env`, `.env.*` such as `.env.local` or `.env.production`, any depth). **Exception: `.env.example` may be read and edited** (it holds placeholders only, never real secrets). Learn config from source code, `.env.example` and `docs/KEYS.md`.
- Never connect to or write to the production database or server without explicit approval. Try data changes and scripts on the dev database (`EventifyDev`) first.
- Develop and test on `develop`; merge to `master` when confirmed. Production runs only `master`.
- Do not commit, push, deploy or send anything unless asked.
- No big rewrites. Extend what exists.

## Stack

NestJS 11, GraphQL (Apollo, code-first), Mongoose/MongoDB, Agenda + `@nestjs/schedule` for jobs, Puppeteer scrapers, Gemini for LLM filtering. TypeScript, tabs for indentation (Prettier).

## Layout

- `apps/api/src`: `components/<feature>/` (module, resolver, service), `schemas/` (Mongoose), `libs/dto`, `libs/enums`, `libs/config.ts` (helpers, `$lookup` builders).
- `apps/batch/src`: `batch.service.ts` (cron entry), `components/` (webCrawling, eventRecurrence, eventStatusCleanup, llm, member).
- `test/`: node-runner tests. `scripts/ops`, `scripts/dev`: operational scripts.
- Details: `docs/ARCHITECTURE.md`.

## Conventions

- One feature = module + resolver + service + DTOs (`input`, `update`, output) + enum if needed.
- Money is points. `exchangeRate` is points per 1 unit of currency. Free events need no currency; paid events must have a valid one (`docs/CURRENCY.md`).
- Errors shown to users are plain sentences (`BadRequestException` with a clear message).
- Markdown file names are UPPERCASE (`KEYS.md`, `ARCHITECTURE.md`); the extension stays lowercase.
- Log through `libs/logger`, not `console`.
- Scripts that touch the database must be dry-run or read-only by default, load no env file, and never print connection strings.

## Before finishing

1. `npm run lint` and `npm test` pass.
2. Update `PROGRESS.md` (and the relevant doc in `docs/` if behavior changed).
3. Report briefly: what changed, what was verified, what needs the maintainer.

## Docs map

`README.md` (overview) · `docs/ARCHITECTURE.md` · `docs/KEYS.md` · `docs/DEPLOY.md` · `docs/OPERATIONS.md` · `docs/CURRENCY.md` · `PROGRESS.md`
