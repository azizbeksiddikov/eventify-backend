#!/bin/bash

set -e

echo "Eventify Docker Cleanup Script"
echo "================================="
echo ""

# Check if Docker daemon is running
if ! docker info > /dev/null 2>&1; then
    echo "Error: Docker daemon is not running. Please start Docker Desktop and try again."
    exit 1
fi

# Find all eventify-related containers (by name pattern)
EVENTIFY_CONTAINERS=$(docker ps -aq --filter "name=eventify-")

if [ -z "$EVENTIFY_CONTAINERS" ]; then
    echo "No eventify containers found"
else
    # Show containers that will be removed
    echo "Found eventify containers:"
    docker ps -a --filter "name=eventify-" --format "   - {{.Names}} ({{.ID}})" || true
    echo ""
    
    # Stop eventify containers
    echo "Stopping eventify containers..."
    docker stop $EVENTIFY_CONTAINERS 2>/dev/null || true
    
    # Remove eventify containers
    echo "Removing eventify containers..."
    docker rm $EVENTIFY_CONTAINERS 2>/dev/null || true
    
    echo "Removed eventify containers successfully!"
fi

# Remove eventify-related images
echo "Removing eventify images..."
EVENTIFY_IMAGES=$(docker images -q --filter "reference=*eventify*")
if [ ! -z "$EVENTIFY_IMAGES" ]; then
    echo "Found images to remove:"
    docker images --filter "reference=*eventify*" --format "   - {{.Repository}}:{{.Tag}} ({{.ID}})" || true
    echo ""
    docker rmi $EVENTIFY_IMAGES 2>/dev/null || true
    echo "Removed eventify images successfully!"
else
    echo "No eventify images found"
fi

# Optional: Remove eventify volumes (commented out by default)
# Uncomment the following lines if you want to remove eventify volumes too
echo "Removing eventify volumes..."
docker volume rm ollama_data 2>/dev/null || true

# Optional: Remove eventify networks (commented out by default)
# Uncomment the following lines if you want to remove eventify networks too
echo "Removing eventify networks..."
docker network rm monorepo-network 2>/dev/null || true

echo ""
echo "Eventify cleanup complete!"
echo ""
echo "Remaining eventify resources:"
EVENTIFY_REMAINING=$(docker ps -aq --filter "name=eventify-")
if [ -z "$EVENTIFY_REMAINING" ]; then
    echo "  Containers: 0"
else
    echo "  Containers: $(echo "$EVENTIFY_REMAINING" | wc -l)"
fi
