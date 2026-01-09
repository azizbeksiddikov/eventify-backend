FROM node:24-alpine AS base

# Install system dependencies for Puppeteer/Chrome and Docker CLI
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    docker-cli

# Set Puppeteer to use installed Chromium
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
