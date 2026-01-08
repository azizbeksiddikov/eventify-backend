#!/bin/bash

echo "Starting PRODUCTION deployment..."

# UNCOMMENT FOR PRODUCTION GIT WORKFLOW
# git reset --hard
# git checkout master
# git pull origin master

# Check if Docker daemon is running
if ! docker info > /dev/null 2>&1; then
    echo "Error: Docker daemon is not running. Please start Docker Desktop and try again."
    exit 1
fi

# Check if .env exists
if [ ! -f .env ]; then
    echo "Error: .env file not found. Please create it from env.example"
    exit 1
fi

echo "Stopping existing production containers..."
docker compose -f docker-compose.prod.yml down

echo "Building production containers..."
docker compose -f docker-compose.prod.yml build --no-cache

echo "Starting production containers..."
docker compose -f docker-compose.prod.yml up -d

echo "Production deployment complete!"
echo "Showing logs (Ctrl+C to exit)..."
docker compose -f docker-compose.prod.yml logs -f

