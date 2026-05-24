#!/bin/bash
# Vercel build script - runs migrations before build

set -e

echo "📦 Installing dependencies in frontend..."
cd frontend
npm ci

echo "🗄️  Running Drizzle migrations..."
npm run db:push || echo "⚠️  Migrations encountered an issue (might be normal if DB is fresh)"

echo "🏗️  Building Next.js..."
npm run build

echo "✅ Build complete!"
