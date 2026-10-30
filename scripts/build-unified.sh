#!/bin/sh
set -e

echo "=============================================================================="
echo " CodeMind AI - Unified Single-Artifact Build Pipeline"
echo " Produces single executable JAR with embedded frontend SPA"
echo "=============================================================================="

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$SCRIPT_DIR/.."

echo ""
echo "[1/3] Compiling and Optimizing Frontend SPA..."
cd "$ROOT_DIR/frontend"
npm ci
npm run build

echo ""
echo "[2/3] Embedding Frontend Assets into Backend Static Resources..."
mkdir -p "$ROOT_DIR/backend/src/main/resources/static"
cp -r "$ROOT_DIR/frontend/dist/"* "$ROOT_DIR/backend/src/main/resources/static/"

echo ""
echo "[3/3] Packaging Unified Spring Boot Executable JAR..."
cd "$ROOT_DIR/backend"
chmod +x ./mvnw
./mvnw clean package -DskipTests

echo ""
echo "=============================================================================="
echo " [SUCCESS] Unified single-artifact JAR created successfully!"
echo " Artifact: backend/target/codemind-backend.jar"
echo ""
echo " To run locally in production mode:"
echo "   java -Dspring.profiles.active=prod -jar backend/target/codemind-backend.jar"
echo "=============================================================================="
