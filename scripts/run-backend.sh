#!/bin/sh
# Start CodeMind AI Backend
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/../backend"
echo "Starting CodeMind AI Backend on port 8080..."
chmod +x ./mvnw
./mvnw spring-boot:run
