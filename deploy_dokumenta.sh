#!/usr/bin/env bash
set -e
APP_DIR="/var/www/dokumenta"
BACKEND_DIR="/var/www/dokumenta/backend"
APP_NAME="dokumenta-portal"
BRANCH="main"

cd "$APP_DIR"
echo "→ Git pull (dokumenta_portal)..."
git pull origin "$BRANCH"

echo "→ NPM install (backend)..."
cd "$BACKEND_DIR"
npm ci || npm install --omit=dev

echo "→ PM2 restart (dokumenta-portal)..."
pm2 restart "$APP_NAME" --update-env

echo "✓ Deploy dokumenta_portal gotovo."
