#!/usr/bin/env bash
set -euo pipefail

# Build images locally, ship to VPS, run without building on the server.

KEY_PATH="${KEY_PATH:-/Users/henriquesantos/Downloads/LightsailDefaultKey-us-east-1.pem}"
HOST="${HOST:-35.174.50.187}"
USER="${USER:-ubuntu}"
REMOTE_DIR="${REMOTE_DIR:-/home/ubuntu/InvestindoEmNegociosWeb}"
PROJECT_NAME="${PROJECT_NAME:-investindoemnegociosweb}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${ROOT_DIR}/../InvestindoEmNegocio"
FRONTEND_DIR="${ROOT_DIR}/investindoEmNegociosWeb"
IMAGE_TAR="${ROOT_DIR}/.investindo-images.tar"

echo "==> Building backend image locally"
docker build -t "${PROJECT_NAME}-backend:latest" -f "${BACKEND_DIR}/Dockerfile" "${BACKEND_DIR}"

echo "==> Building frontend image locally"
docker build -t "${PROJECT_NAME}-frontend:latest" -f "${FRONTEND_DIR}/Dockerfile" "${FRONTEND_DIR}"

echo "==> Saving images to tar"
docker save -o "${IMAGE_TAR}" "${PROJECT_NAME}-backend:latest" "${PROJECT_NAME}-frontend:latest"

echo "==> Uploading compose + env + images to VPS"
rsync -av --progress -e "ssh -i ${KEY_PATH}" \
  "${ROOT_DIR}/docker-compose.yml" \
  "${ROOT_DIR}/.env" \
  "${IMAGE_TAR}" \
  "${USER}@${HOST}:${REMOTE_DIR}/"

echo "==> Loading images and starting containers on VPS (no build)"
ssh -i "${KEY_PATH}" "${USER}@${HOST}" <<EOF
set -euo pipefail
mkdir -p "${REMOTE_DIR}"
cd "${REMOTE_DIR}"
docker load -i "$(basename "${IMAGE_TAR}")"
docker compose -p "${PROJECT_NAME}" down || true
docker compose -p "${PROJECT_NAME}" up -d --no-build
EOF

echo "==> Done"
