#!/bin/sh

echo "=============================================================================="
echo " CodeMind AI - Cryptographic JWT Secret Generator (256-bit HMAC-SHA256)"
echo "=============================================================================="

if command -v openssl >/dev/null 2>&1; then
    JWT_SECRET=$(openssl rand -base64 32)
else
    JWT_SECRET=$(head -c 32 /dev/urandom | base64)
fi

echo ""
echo "Your generated production JWT_SECRET is:"
echo ""
echo "  $JWT_SECRET"
echo ""
echo "Place this value in your .env.production file:"
echo "  JWT_SECRET=$JWT_SECRET"
echo "=============================================================================="
