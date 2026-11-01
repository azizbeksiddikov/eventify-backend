# Eventify Backend

NestJS + GraphQL + MongoDB backend for [Eventify](https://eventify.azbek.me): events, groups, tickets paid in points, social features, and a daily crawler that imports events from Meetup and Luma.

Two apps in one repo:

- **api**: GraphQL API (`/graphql`), image upload (`/upload`), static files (`/uploads`).
- **batch**: scheduled jobs (recurring events, crawling, cleanup).

## Quick start

Needs Node 24 and a MongoDB.

```bash
npm install
cp .env.example .env.dev   # fill in values, see docs/KEYS.md
npm run dev                # API  -> http://localhost:4201/graphql
npm run dev:batch          # batch (optional)
npm test
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `dev:batch` | API / batch in watch mode |
| `npm run build` | build both apps into `dist/` |
| `npm run start:prod` / `start:prod:batch` | run the built apps |
| `npm test` | node test runner over `test/*.test.ts` |
| `npm run lint` | ESLint with autofix |

## Docs

| File | Content |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | apps, modules, data model, batch jobs |
| [docs/KEYS.md](docs/KEYS.md) | environment variables and secrets (names only) |
| [docs/DEPLOY.md](docs/DEPLOY.md) | Docker, ports, deploy |
| [docs/OPERATIONS.md](docs/OPERATIONS.md) | crawler, refresh, ops scripts |
| [docs/CURRENCY.md](docs/CURRENCY.md) | currencies, points, free vs paid events |
| [PROGRESS.md](PROGRESS.md) | status and next steps |
| [AGENTS.md](AGENTS.md) | rules for AI agents working here |

Companion repo: `eventify-client` (Next.js website).

## License

MIT
