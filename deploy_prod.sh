#!/bin/bash

set -e

echo "Starting PRODUCTION deployment..."
echo ""

# UNCOMMENT FOR PRODUCTION GIT WORKFLOW
# git reset --hard
# git checkout master
# git pull origin master

# Check if Docker daemon is not running
if ! docker info > /dev/null 2>&1; then
    echo "Error: Docker daemon is not running."
    exit 1
fi

# Check if .env exists
if [ ! -f .env ]; then
    echo "Error: .env file not found. Create it from env.example"
    exit 1
fi

echo "Stopping existing containers and removing volumes..."
docker compose -f docker-compose.prod.yml down -v

echo "Cleaning up orphaned Docker networks and volumes..."
docker network prune -f > /dev/null 2>&1 || true
docker volume prune -f > /dev/null 2>&1 || true

echo "Checking for base image (node:24-alpine)..."
if ! docker image inspect node:24-alpine > /dev/null 2>&1; then
    echo "Base image not found. Pulling node:24-alpine..."
    docker pull node:24-alpine
    echo "Base image pulled successfully."
else
    echo "Base image already exists."
fi

echo "Building containers..."
docker compose -f docker-compose.prod.yml build --no-cache

echo "Starting containers..."
docker compose -f docker-compose.prod.yml up -d

echo "Waiting for containers to be ready..."
sleep 10



echo ""
echo "Deployment complete!"
docker ps --filter "name=eventify" --format "table {{.Names}}\t{{.Status}}"
echo ""
echo "Following logs (Ctrl+C to exit)..."
echo ""

docker compose -f docker-compose.prod.yml logs -f api batch

