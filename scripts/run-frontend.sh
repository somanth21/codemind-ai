#!/bin/sh
# Start CodeMind AI Frontend
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/../frontend"
echo "Starting CodeMind AI Frontend on port 5173..."
npm run dev
