FROM node:24-alpine AS base

# Docker CLI is always installed. Chromium (and its fonts/libs, the slow and heavy part)
# is installed only when WEB_CRAWLING_ENABLED=true at build time.
ARG WEB_CRAWLING_ENABLED=false
RUN apk add --no-cache ca-certificates docker-cli && \
    if [ "$WEB_CRAWLING_ENABLED" = "true" ]; then \
      apk add --no-cache chromium nss freetype harfbuzz ttf-freefont; \
    fi

# Puppeteer uses the system Chromium (never downloads its own)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /usr/src/eventify

FROM base AS dependencies
COPY package.json package-lock.json* ./
# Install with production flags and clean cache
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

FROM dependencies AS development-deps
COPY package.json package-lock.json* ./
RUN npm ci

FROM development-deps AS development
COPY . .
CMD ["npm", "run", "dev"]

FROM development-deps AS build
COPY . .
RUN npm run build && \
    npm prune --production && \
    npm cache clean --force && \
    rm -rf /tmp/* /root/.npm /root/.cache

FROM base AS production
# Copy only production dependencies
COPY --from=dependencies /usr/src/eventify/node_modules ./node_modules
# Copy built application
COPY --from=build /usr/src/eventify/dist ./dist
COPY --from=build /usr/src/eventify/package.json ./

RUN mkdir -p uploads jsons && \
    # Clean up unnecessary files
    rm -rf /tmp/* /root/.npm /root/.cache


# Set NODE_ENV
ENV NODE_ENV=production

CMD ["node", "dist/apps/api/main"]
