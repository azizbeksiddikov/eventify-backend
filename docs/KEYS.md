# Keys and environment variables

Names and meaning only. **Never put real values in this file, the repo, or chat.** Values live in `.env` (production) and `.env.dev` (local), both git-ignored. A template is `.env.example`.

Derived from source code, not from env files.

| Variable                           | Used by    | Required | Meaning                                                                                            |
| ---------------------------------- | ---------- | -------- | -------------------------------------------------------------------------------------------------- |
| `PORT_API`                         | api        | yes      | port the API listens on (app throws if missing)                                                    |
| `PORT_BATCH`                       | batch      | yes      | port the batch app listens on                                                                      |
| `NODE_ENV`                         | both       | no       | `production` hides the dev-only `/llm` module and labels the DB log                                |
| `MONGODB_URI`                      | both       | yes      | MongoDB connection string (also used by Agenda)                                                    |
| `SECRET_TOKEN`                     | api        | yes      | JWT signing secret. Rotating it logs everyone out                                                  |
| `GEMINI_API_KEY`                   | api, batch | no       | enables LLM features. Without it the crawler skips LLM filtering and `/llm` reports a hint         |
| `WEB_CRAWLING_ENABLED`             | batch      | no       | `true` turns the 02:00 crawler on and (at image build) installs Chromium. Anything else skips both |
| `SAVE_JSON_FILES`                  | batch      | no       | `true` dumps raw scraper JSON into `jsons/` (debug; false in prod compose)                         |
| `PUPPETEER_EXECUTABLE_PATH`        | batch      | no       | Chromium binary, default `/usr/bin/chromium` (Docker image sets `/usr/bin/chromium-browser`)       |
| `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD` | build      | no       | `true`, Chromium comes from the image                                                              |

## Where each lives

| Environment | File                 | Notes                             |
| ----------- | -------------------- | --------------------------------- |
| Local dev   | `.env.dev`           | local or dev Mongo                |
| Production  | `.env` on the server | never overwrite it when deploying |

## Rules

- Never commit real keys or secrets to the repo.
- Never paste real keys or secrets into chat.
