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

echo "Stopping existing development containers..."
docker compose -f docker-compose.dev.yml down

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
sleep 5

OLLAMA_MODEL=$(grep -E '^OLLAMA_MODEL=' .env.dev | cut -d '=' -f2 | tr -d '[:space:]')

if ! docker exec eventify-ollama ollama list | grep -q "$OLLAMA_MODEL"; then
    echo "Pulling Ollama model: $OLLAMA_MODEL..."
    docker exec eventify-ollama ollama pull "$OLLAMA_MODEL"
else
    echo "Ollama model $OLLAMA_MODEL already exists"
fi

echo "Development deployment complete!"
echo "Showing logs (Ctrl+C to exit)..."
docker compose -f docker-compose.dev.yml logs -f

