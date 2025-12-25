FROM node:24.11.1

RUN corepack enable \
 && corepack prepare pnpm@10.26.2 --activate

WORKDIR /usr/src/eventify
