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

LLM_ENABLED=$(grep -E '^LLM_ENABLED=' .env.dev | cut -d '=' -f2 | tr -d '[:space:]')

echo "Stopping existing development containers..."
docker compose -f docker-compose.dev.yml down

echo "Building development containers..."
docker compose -f docker-compose.dev.yml build --no-cache

PROFILES=""
if [ "$LLM_ENABLED" = "true" ]; then
    echo "LLM enabled, starting with Ollama..."
    PROFILES="--profile llm"
fi

echo "Starting development containers..."
docker compose -f docker-compose.dev.yml $PROFILES up -d

if [ "$LLM_ENABLED" = "true" ]; then
    echo "Waiting for Ollama to be ready..."
    sleep 5
    
    OLLAMA_MODEL=$(grep -E '^OLLAMA_MODEL=' .env.dev | cut -d '=' -f2 | tr -d '[:space:]')
    
    if ! docker exec eventify-ollama ollama list | grep -q "$OLLAMA_MODEL"; then
        echo "Pulling Ollama model: $OLLAMA_MODEL..."
        docker exec eventify-ollama ollama pull "$OLLAMA_MODEL"
    else
        echo "Ollama model $OLLAMA_MODEL already exists"
    fi
fi

echo "Development deployment complete!"
echo "Showing logs (Ctrl+C to exit)..."
docker compose -f docker-compose.dev.yml logs -f

