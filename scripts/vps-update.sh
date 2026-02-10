#!/bin/bash
# ==============================================================================
# Chef-to-Cart VPS Update Script
# Usage: ./scripts/vps-update.sh
# ==============================================================================

set -e

echo "🔄 Pulling latest changes from Git..."
git pull origin main

echo "📦 Installing dependencies..."
npm install

echo "🏗️ Building the application..."
npm run build

echo "🛑 Stopping existing server..."
pkill -f "next-server" || true
pkill -f "node" || true

echo "🚀 Starting fresh server..."
nohup npm run start -- -p 3000 -H 0.0.0.0 > app.log 2>&1 &

echo "✅ Update complete! App is running on port 3000."
echo "📜 Check logs with: tail -f app.log"
