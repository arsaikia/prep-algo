#!/bin/bash

# Quick Frontend Firebase Deployment Script
# Simplified version for rapid deployments

set -e

echo "🚀 Quick Frontend Deployment to Firebase"

# Configuration
PROJECT_NAME="prepalgo"
FRONTEND_DIR="frontend"

# Setup environment
if [ ! -f "$FRONTEND_DIR/.env.production" ]; then
    echo "Creating .env.production..."
    cat > "$FRONTEND_DIR/.env.production" << EOF
VITE_API_BASE_URI=https://prep-algo-backend-419917211939.us-central1.run.app/api/v1
EOF
fi

# Clean and build. Question content ships from frontend/public/content/, a
# gitignored build artifact, so generate it before the Vite build copies it.
echo "Building frontend..."
npm run build:content
cd "$FRONTEND_DIR"
rm -rf build
npm install
npm run build
cd ..

# Deploy
echo "Deploying to Firebase..."
firebase deploy --only hosting --project "$PROJECT_NAME"

echo "✅ Frontend deployed successfully!"
echo "🌐 URL: https://$PROJECT_NAME.web.app" 