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
LLM_ENABLED=$(grep -E "^LLM_ENABLED=" .env | cut -d '=' -f2 | tr -d ' ')
OLLAMA_MODEL=$(grep -E "^OLLAMA_MODEL=" .env | cut -d '=' -f2 | tr -d ' ')

# Build profiles string
PROFILES="--profile batch"
if [ "$LLM_ENABLED" = "true" ]; then
    PROFILES="$PROFILES --profile llm"
fi

echo "Stopping existing containers..."
docker compose -f docker-compose.prod.yml down

echo "Building containers..."
docker compose -f docker-compose.prod.yml build --no-cache $PROFILES

echo "Starting containers..."
docker compose -f docker-compose.prod.yml $PROFILES up -d

echo "Waiting for containers to be ready..."
sleep 5

if [ "$LLM_ENABLED" = "true" ]; then
    echo "Waiting for Ollama..."
    for i in {1..30}; do
        if docker exec eventify-ollama curl -s http://localhost:11434/api/version > /dev/null 2>&1; then
            break
        fi
        sleep 2
    done
    
    echo "Checking model ($OLLAMA_MODEL)..."
    if ! docker exec eventify-ollama ollama list 2>/dev/null | grep -q "$OLLAMA_MODEL"; then
        echo "Pulling model..."
        docker exec eventify-ollama ollama pull "$OLLAMA_MODEL"
    fi
fi

echo ""
echo "Deployment complete!"
docker ps --filter "name=eventify" --format "table {{.Names}}\t{{.Status}}"
echo ""
echo "Following logs (Ctrl+C to exit)..."
echo ""

docker compose -f docker-compose.prod.yml logs -f

