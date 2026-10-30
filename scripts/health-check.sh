#!/bin/sh

echo "=============================================================================="
echo " CodeMind AI - Production Deployment Health Check"
echo "=============================================================================="

BACKEND_URL="${1:-http://localhost:8080}"

echo "[1/4] Checking Backend Public Health ($BACKEND_URL/api/v1/health)..."
if curl -s -f "$BACKEND_URL/api/v1/health" > /dev/null; then
    echo "  -> STATUS: UP [200 OK]"
else
    echo "  -> STATUS: DOWN / UNREACHABLE"
fi

echo ""
echo "[2/4] Checking Spring Actuator Probes ($BACKEND_URL/actuator/health)..."
if curl -s -f "$BACKEND_URL/actuator/health" > /dev/null; then
    echo "  -> STATUS: ACTUATOR HEALTHY [200 OK]"
else
    echo "  -> STATUS: ACTUATOR WARNING / NON-200"
fi

echo ""
echo "[3/4] Testing Admin Authentication & Database Access..."
AUTH_RESP=$(curl -s -X POST "$BACKEND_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@codemind.ai","password":"AdminSecure123!"}')

if echo "$AUTH_RESP" | grep -q "accessToken"; then
    echo "  -> STATUS: AUTHENTICATION & DATABASE READY [200 OK]"
else
    echo "  -> STATUS: AUTHENTICATION FAILED OR ADMIN NOT PROVISIONED"
fi

echo ""
echo "[4/4] Checking Frontend HTTP Listener..."
if curl -s -f "http://localhost:80" > /dev/null; then
    echo "  -> STATUS: FRONTEND RUNNING ON PORT 80 [200 OK]"
elif curl -s -f "http://localhost:5173" > /dev/null; then
    echo "  -> STATUS: FRONTEND RUNNING ON PORT 5173 (DEV MODE) [200 OK]"
else
    echo "  -> STATUS: NO FRONTEND DETECTED ON PORT 80 OR 5173"
fi

echo ""
echo "=============================================================================="
echo " Health check complete."
echo "=============================================================================="
