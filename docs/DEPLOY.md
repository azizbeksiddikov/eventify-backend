# Deploy

The app runs with Docker behind a reverse proxy (nginx). Production runs only `master`.

## Docker

`Dockerfile` has stages `base` (Node 24 alpine, Chromium, docker-cli), `development`, `build`, `production`. Both apps use the same image build; the command picks the app.

|                 | Dev compose              | Prod compose                           |
| --------------- | ------------------------ | -------------------------------------- |
| File            | `docker-compose.dev.yml` | `docker-compose.prod.yml`              |
| Env file        | `.env.dev`               | `.env`                                 |
| API host port   | 5001                     | 4001 (container 3007)                  |
| Batch host port | 5002                     | 4002 (container 3008)                  |
| Limits          |                          | api 800M / 1 CPU, batch 800M / 0.5 CPU |

Volumes: `./uploads` is shared by api and batch. The batch container also mounts the Docker socket.

Scripts: `deploy_dev.sh`, `deploy_prod.sh` (down, rebuild with `--no-cache`, up, follow logs), `cleanup_docker.sh`.

## Redeploy

1. Merge to `master`.
2. Copy the code to the server, excluding env files, `uploads/`, `node_modules` and `dist`.
3. On the server run `docker compose -f docker-compose.prod.yml up -d --build` and check the logs.
4. Check that `/graphql` loads.

## nginx

`eventify.conf` is the reverse proxy config: HTTP redirects to HTTPS, `/api/` and `/graphql` go to the API (host port 4001), everything else to the website.

## Backups

Keep a copy of `uploads/` and a recent database dump outside the server.
