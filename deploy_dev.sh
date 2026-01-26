#!/bin/bash

echo "Starting DEVELOPMENT deployment..."

# Check if Docker daemon is running
if ! docker info > /dev/null 2>&1; then
    echo "Error: Docker daemon is not running. Please start Docker Desktop and try again."
    exit 1
fi

# Check if .env.dev exists
if [ ! -f .env.dev ]; then
    echo "Error: .env.dev file not found. Please create it from env.example"
    exit 1
fi

echo "Stopping existing development containers and removing volumes..."
docker compose -f docker-compose.dev.yml down -v

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

echo "Building development containers..."
docker compose -f docker-compose.dev.yml build --no-cache

echo "Starting development containers..."
docker compose -f docker-compose.dev.yml up -d



echo "Development deployment complete!"
echo "Showing logs (Ctrl+C to exit)..."
docker compose -f docker-compose.dev.yml logs -f

