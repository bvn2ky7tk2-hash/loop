#!/bin/sh
# Generate self-signed certificate for local development
# Run: sh infra/nginx/generate-certs.sh

CERTS_DIR="$(dirname "$0")/certs"
mkdir -p "$CERTS_DIR"

openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
  -keyout "$CERTS_DIR/loop.key" \
  -out "$CERTS_DIR/loop.crt" \
  -subj "/C=VN/ST=HCM/L=HoChiMinh/O=Loop/CN=loop.internal" \
  -addext "subjectAltName=DNS:localhost,DNS:loop.internal,IP:127.0.0.1"

echo "✅ Self-signed certificate generated at $CERTS_DIR"
