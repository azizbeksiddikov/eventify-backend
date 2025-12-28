FROM node:24.11.1-slim

# Install system dependencies for Puppeteer/Chrome
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libxshmfence1 \
    curl \
    chromium \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable \
 && corepack prepare pnpm@10.26.2 --activate

WORKDIR /usr/src/eventify
