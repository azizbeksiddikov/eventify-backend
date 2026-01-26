#!/bin/bash
# Eventify Backend Docker Cleanup Script

set -e

# Check if Docker daemon is running
if ! docker info > /dev/null 2>&1; then
    echo "Error: Docker daemon is not running. Please start Docker Desktop and try again."
    exit 1
fi

# Find backend containers (api, batch - both dev and prod)
BACKEND_CONTAINERS=$(docker ps -aq --filter "name=eventify-api" --filter "name=eventify-batch" | sort -u)

if [ -z "$BACKEND_CONTAINERS" ]; then
    echo "No backend containers found"
else
    # Show containers that will be removed
    echo "Found backend containers (dev and prod):"
    docker ps -a --filter "name=eventify-api" --filter "name=eventify-batch" --format "   - {{.Names}} ({{.ID}})" || true
    echo ""
    
    # Stop backend containers
    echo "Stopping backend containers..."
    docker stop $BACKEND_CONTAINERS 2>/dev/null || true
    
    # Remove backend containers
    echo "Removing backend containers..."
    docker rm $BACKEND_CONTAINERS 2>/dev/null || true
    
    echo "Removed backend containers successfully!"
fi

# Remove backend images (api and batch - both dev and prod)
echo "Removing backend images (dev and prod)..."
BACKEND_IMAGES=$(docker images -q --filter "reference=eventify-api*" --filter "reference=eventify-batch*" | sort -u)
if [ ! -z "$BACKEND_IMAGES" ]; then
    echo "Found images to remove:"
    docker images --filter "reference=eventify-api*" --filter "reference=eventify-batch*" --format "   - {{.Repository}}:{{.Tag}} ({{.ID}})" || true
    echo ""
    docker rmi $BACKEND_IMAGES 2>/dev/null || true
    echo "Removed backend images successfully!"
else
    echo "No backend images found"
fi

# Remove backend networks (both dev and prod)
echo "Removing backend networks..."
docker network rm monorepo-network-dev 2>/dev/null || true
docker network rm monorepo-network-prod 2>/dev/null || true

# Remove dangling images
echo "Removing dangling images..."
docker image prune -f > /dev/null 2>&1 || true

# Prune unused Docker resources
echo "Cleaning up unused Docker resources..."
docker system prune -f > /dev/null 2>&1 || true

echo ""
echo "Backend cleanup complete!"
echo ""
echo "Remaining backend resources:"
BACKEND_REMAINING=$(docker ps -aq --filter "name=eventify-api" --filter "name=eventify-batch"| sort -u)
if [ -z "$BACKEND_REMAINING" ]; then
    echo "  Containers: 0"
else
    echo "  Containers: $(echo "$BACKEND_REMAINING" | wc -l | tr -d ' ')"
fi
