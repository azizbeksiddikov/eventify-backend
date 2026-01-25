#!/bin/bash

set -e

echo "Starting PRODUCTION deployment..."
echo ""

# UNCOMMENT FOR PRODUCTION GIT WORKFLOW
# git reset --hard
# git checkout master
# git pull origin master

# Check if Docker daemon is running
if ! docker info > /dev/null 2>&1; then
    echo "Error: Docker daemon is not running."
    exit 1
fi

# Check if .env exists
if [ ! -f .env ]; then
    echo "Error: .env file not found. Create it from env.example"
    exit 1
fi

# Read from .env
OLLAMA_MODEL=$(grep -E "^OLLAMA_MODEL=" .env | cut -d '=' -f2 | tr -d '[:space:]')

# Always use llm profile for web scraping
PROFILES="--profile llm"

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
docker compose -f docker-compose.prod.yml $PROFILES up -d

echo "Waiting for containers to be ready..."
sleep 10

# Wait for Ollama to be accessible
OLLAMA_CONTAINER="eventify-ollama"
echo "Waiting for Ollama..."
OLLAMA_READY=false
for i in {1..30}; do
    if docker exec $OLLAMA_CONTAINER ollama list > /dev/null 2>&1; then
        echo "Ollama is ready!"
        OLLAMA_READY=true
        break
    fi
    echo "Waiting for Ollama... ($i/30)"
    sleep 2
done

if [ "$OLLAMA_READY" = false ]; then
    echo "Error: Ollama failed to start within 60 seconds"
    echo "Check logs with: docker logs $OLLAMA_CONTAINER"
    exit 1
fi

echo "Checking model ($OLLAMA_MODEL)..."
if [ -z "$OLLAMA_MODEL" ]; then
    echo "Warning: OLLAMA_MODEL not set in .env"
else
    if ! docker exec $OLLAMA_CONTAINER ollama list 2>/dev/null | grep -q "$OLLAMA_MODEL"; then
        echo "Model not found. Pulling model..."
        docker exec $OLLAMA_CONTAINER ollama pull "$OLLAMA_MODEL"
        echo "Model $OLLAMA_MODEL installed successfully!"
    else
        echo "Model $OLLAMA_MODEL already exists."
    fi
fi

echo ""
echo "Deployment complete!"
docker ps --filter "name=eventify" --format "table {{.Names}}\t{{.Status}}"
echo ""
echo "Following logs (Ctrl+C to exit)..."
echo ""

docker compose -f docker-compose.prod.yml $PROFILES logs -f api batch

