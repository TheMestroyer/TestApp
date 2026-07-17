#!/usr/bin/env bash
# Build the backend/frontend images and push them to GHCR.
# Usage: scripts/release.sh [tag]   (tag defaults to "latest")
set -euo pipefail

REGISTRY="ghcr.io/themestroyer"
TAG="${1:-latest}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> Building backend ($REGISTRY/studytest-backend:$TAG)"
docker build -t "$REGISTRY/studytest-backend:$TAG" "$ROOT_DIR/backend"

echo "==> Building frontend ($REGISTRY/studytest-frontend:$TAG)"
docker build -t "$REGISTRY/studytest-frontend:$TAG" "$ROOT_DIR/frontend"

echo "==> Pushing backend"
docker push "$REGISTRY/studytest-backend:$TAG"

echo "==> Pushing frontend"
docker push "$REGISTRY/studytest-frontend:$TAG"

echo "==> Done. On the server: docker compose pull && docker compose up -d"
