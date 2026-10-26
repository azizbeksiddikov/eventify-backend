# Run Eventify locally and open it from anywhere (ngrok)

A safe local copy: your own MongoDB (restored from the latest server backup), the API, the website and one ngrok tunnel.
Nothing here touches the production server or database.

| Part | How | Port |
|---|---|---|
| MongoDB (disposable copy) | `docker run -d --name eventify-local-mongo -p 127.0.0.1:27018:27017 mongo:7`, then `mongorestore --uri mongodb://127.0.0.1:27018 --archive=<server-backup/db/DATE>/EventifyProd.archive --gzip` | 27018 |
| Images | copy `server-backup/uploads/` into `eventify-backend/uploads/` (git-ignored) | |
| API | in `eventify-backend/`: `PORT_API=4101 MONGODB_URI=mongodb://127.0.0.1:27018/EventifyProd SECRET_TOKEN=<any local value> DOMAIN_NAME=localhost WEB_CRAWLING_ENABLED=false npx nest start api` | 4101 |
| Proxy (mirrors production nginx: `/api`, `/graphql`, everything else to the site) | `node scripts/dev/tunnel-proxy.js` (`PORT=8080 API_PORT=4101 CLIENT_PORT=3200`) | 8080 |
| Tunnel | `ngrok http 8080`, read the URL from `http://127.0.0.1:4040/api/tunnels` | |
| Website | in `eventify-client/`: `NEXT_PUBLIC_API_GRAPHQL_URL=<ngrok url>/graphql NEXT_APP_API_URL=<ngrok url>/api npx next dev --webpack -p 3200` | 3200 |

Command-line values win over any env file, so the real keys are never used. Keep the Mac awake with `caffeinate -dimsu -t <seconds>`.

## Notes
- Use `--webpack`: Turbopack dev fails on the Noto Sans KR font in this project.
- If `npm ci` was never run on this Mac, the website fails with a missing `lightningcss` binary. Run `npm ci` in `eventify-client/`.
- ngrok's free plan shows a one-time "Visit Site" page; the first dev-mode load takes 10 to 15 seconds.
- The ngrok URL changes whenever ngrok restarts. Restart the website dev server with the new URL afterwards.
