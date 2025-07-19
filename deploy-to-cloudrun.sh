#!/bin/bash

# Cloud Run Deployment Script
# This script deploys the backend to Cloud Run with all required environment variables and secrets

set -e

echo "🚀 Deploying to Cloud Run..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Get project ID
PROJECT_ID=$(gcloud config get-value project)
if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}❌ No project ID set. Please run: gcloud config set project YOUR_PROJECT_ID${NC}"
    exit 1
fi

echo -e "${BLUE}📋 Project ID: $PROJECT_ID${NC}"

# Check if secrets exist
echo -e "${YELLOW}🔍 Checking required secrets...${NC}"

check_secret() {
    local secret_name=$1
    if gcloud secrets describe $secret_name &> /dev/null; then
        echo -e "${GREEN}✅ $secret_name exists${NC}"
        return 0
    else
        echo -e "${RED}❌ $secret_name does not exist${NC}"
        return 1
    fi
}

# Check all required secrets
SECRETS=("MONGO_URI" "JWT_SECRET" "GOOGLE_CLIENT_ID")
MISSING_SECRETS=()

for secret in "${SECRETS[@]}"; do
    if ! check_secret $secret; then
        MISSING_SECRETS+=($secret)
    fi
done

# If secrets are missing, offer to create them
if [ ${#MISSING_SECRETS[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Some secrets are missing. Would you like to create them now? (y/n)${NC}"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        for secret in "${MISSING_SECRETS[@]}"; do
            echo -e "${BLUE}Enter value for $secret:${NC}"
            read -s secret_value
            echo "$secret_value" | gcloud secrets create $secret --data-file=-
            echo -e "${GREEN}✅ Created secret: $secret${NC}"
        done
    else
        echo -e "${RED}❌ Cannot deploy without required secrets. Please create them manually.${NC}"
        exit 1
    fi
fi

# Enable required APIs if not already enabled
echo -e "${YELLOW}🔧 Enabling required APIs...${NC}"
gcloud services enable run.googleapis.com --quiet
gcloud services enable cloudbuild.googleapis.com --quiet
gcloud services enable containerregistry.googleapis.com --quiet
gcloud services enable secretmanager.googleapis.com --quiet

# Deploy using Cloud Build
echo -e "${YELLOW}🚀 Deploying using Cloud Build...${NC}"

cd backend

# Submit build to Cloud Build
gcloud builds submit --config cloudbuild.yaml .

# Get service URL
SERVICE_URL=$(gcloud run services describe prep-algo-backend --region=us-central1 --format='value(status.url)')

echo -e "${GREEN}✅ Deployment successful!${NC}"
echo ""
echo -e "${BLUE}📊 Service Information:${NC}"
echo -e "Service URL: ${GREEN}$SERVICE_URL${NC}"
echo -e "Region: ${GREEN}us-central1${NC}"
echo -e "Memory: ${GREEN}512Mi${NC}"
echo -e "CPU: ${GREEN}1${NC}"
echo -e "Max Instances: ${GREEN}10${NC}"
echo -e "Min Instances: ${GREEN}0${NC}"
echo ""

# Test the deployment
echo -e "${YELLOW}🧪 Testing deployment...${NC}"
if curl -f "$SERVICE_URL/health" &> /dev/null; then
    echo -e "${GREEN}✅ Health check passed!${NC}"
else
    echo -e "${YELLOW}⚠️  Health check failed or service is still starting up${NC}"
fi

echo ""
echo -e "${BLUE}🔗 Useful commands:${NC}"
echo -e "View logs: ${GREEN}gcloud logging read 'resource.type=cloud_run_revision AND resource.labels.service_name=prep-algo-backend' --limit=50${NC}"
echo -e "Service details: ${GREEN}gcloud run services describe prep-algo-backend --region=us-central1${NC}"
echo -e "Update service: ${GREEN}gcloud run services update prep-algo-backend --region=us-central1${NC}"
echo ""
echo -e "${GREEN}🎉 Deployment complete!${NC}" 