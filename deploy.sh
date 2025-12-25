#!/bin/bash

# PRODUCTION
git reset --hard
git checkout master
git pull origin master

# Check if Docker daemon is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker daemon is not running. Please start Docker Desktop and try again."
    exit 1
fi

docker compose down
docker compose build --no-cache
docker compose up -d
