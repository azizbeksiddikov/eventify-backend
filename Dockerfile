FROM node:24-alpine AS base

# Install system dependencies for Puppeteer/Chrome
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    git

# Set Puppeteer to use installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /usr/src/eventify

FROM base AS dependencies
COPY package.json package-lock.json* ./
RUN npm ci

FROM dependencies AS development
COPY . .
CMD ["npm", "run", "dev"]

FROM dependencies AS build
COPY . .
RUN npm run build
RUN npm prune --production

FROM base AS production
COPY --from=build /usr/src/eventify/dist ./dist
COPY --from=build /usr/src/eventify/node_modules ./node_modules
COPY --from=build /usr/src/eventify/package.json ./

# Create uploads directory
RUN mkdir -p uploads && chown -R node:node uploads

# Set NODE_ENV (can be overridden by docker-compose)
ENV NODE_ENV=production

CMD ["node", "dist/apps/api/main"]
