#!/bin/sh
set -e

echo "=============================================================================="
echo " CodeMind AI - Production Docker Deployment"
echo "=============================================================================="

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$SCRIPT_DIR/.."
cd "$ROOT_DIR"

if [ ! -f ".env.production" ]; then
    if [ -f ".env" ]; then
        echo "[INFO] Using .env file for deployment..."
        cp .env .env.production
    else
        echo "[WARNING] No .env.production file found!"
        echo "Copying .env.production.example to .env.production..."
        cp .env.production.example .env.production
        echo "[IMPORTANT] Please update .env.production with your real secrets and database credentials."
    fi
fi

echo ""
echo "Building and starting containers via Docker Compose..."
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

echo ""
echo "=============================================================================="
echo " [SUCCESS] CodeMind AI successfully deployed!"
echo " Frontend: http://localhost"
echo " Backend:  http://localhost:8080/api/v1/health"
echo "=============================================================================="
