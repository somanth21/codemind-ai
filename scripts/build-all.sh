#!/bin/sh
set -e

echo "=============================================================================="
echo " CodeMind AI - Complete Production Build Pipeline"
echo "=============================================================================="

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$SCRIPT_DIR/.."

echo ""
echo "[1/2] Building Frontend Production Bundle..."
cd "$ROOT_DIR/frontend"
npm ci
npm run build

echo ""
echo "[2/2] Building Backend Executable JAR..."
cd "$ROOT_DIR/backend"
chmod +x ./mvnw
./mvnw clean package -DskipTests

echo ""
echo "=============================================================================="
echo " [SUCCESS] All components built successfully!"
echo " Backend JAR: backend/target/codemind-backend.jar"
echo " Frontend:    frontend/dist"
echo "=============================================================================="
