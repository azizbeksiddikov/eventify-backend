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

echo "Starting development containers with Ollama..."
PROFILES="--profile llm"

echo "Starting development containers..."
docker compose -f docker-compose.dev.yml $PROFILES up -d

echo "Waiting for Ollama to be ready..."
sleep 10

# Wait for Ollama to be accessible
OLLAMA_CONTAINER="eventify-ollama"
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

OLLAMA_MODEL=$(grep -E '^OLLAMA_MODEL=' .env.dev | cut -d '=' -f2 | tr -d '[:space:]')

if [ -z "$OLLAMA_MODEL" ]; then
    echo "Warning: OLLAMA_MODEL not set in .env.dev"
else
    if ! docker exec $OLLAMA_CONTAINER ollama list 2>/dev/null | grep -q "$OLLAMA_MODEL"; then
        echo "Pulling Ollama model: $OLLAMA_MODEL..."
        docker exec $OLLAMA_CONTAINER ollama pull "$OLLAMA_MODEL"
        echo "Model $OLLAMA_MODEL installed successfully!"
    else
        echo "Ollama model $OLLAMA_MODEL already exists"
    fi
fi

echo "Development deployment complete!"
echo "Showing logs (Ctrl+C to exit)..."
docker compose -f docker-compose.dev.yml logs -f

