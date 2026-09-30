#!/bin/bash

# Cloud Run Deployment Script
#
#   ./deploy-to-cloudrun.sh            build and deploy a "candidate" revision at
#                                      0% traffic, then smoke-test its tag URL
#   ./deploy-to-cloudrun.sh --promote  send 100% of traffic to the candidate
#
# Live traffic never moves until you promote, and the promote step prints the
# command that rolls back to the revision it replaced. Env vars and secrets are
# never set by this script; each revision inherits the service's configuration.

set -e
cd "$(dirname "$0")"

SERVICE="prep-algo-backend"
REGION="us-central1"
TAG="candidate"

MODE="deploy"
case "$1" in
    "") ;;
    --promote) MODE="promote" ;;
    *) echo "Usage: $0 [--promote]"; exit 1 ;;
esac

echo "🚀 Cloud Run: $MODE"

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

# Env vars and secrets live on the service (Cloud Run console), and each deploy
# inherits them. A service that does not exist yet would start with none.
if ! gcloud run services describe "$SERVICE" --region="$REGION" &> /dev/null; then
    echo -e "${RED}❌ Service $SERVICE not found in $REGION. Create it and set its env vars and secrets first.${NC}"
    exit 1
fi


tag_url() {
    gcloud run services describe "$SERVICE" --region="$REGION" --format=json \
        | TAG="$TAG" node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const t=(JSON.parse(s).status.traffic||[]).find(x=>x.tag===process.env.TAG);console.log(t&&t.url?t.url:"")})'
}

if [ "$MODE" = "promote" ]; then
    PREVIOUS=$(gcloud run services describe "$SERVICE" --region="$REGION" --format=json \
        | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const t=(JSON.parse(s).status.traffic||[]).filter(x=>x.percent>0).sort((a,b)=>b.percent-a.percent)[0];console.log(t?t.revisionName:"")})')
    gcloud run services update-traffic "$SERVICE" --region="$REGION" --to-tags "$TAG=100"
    echo -e "${GREEN}✅ 100% of traffic now on the $TAG revision${NC}"
    if [ -n "$PREVIOUS" ]; then
        echo -e "Roll back with: ${YELLOW}gcloud run services update-traffic $SERVICE --region=$REGION --to-revisions=$PREVIOUS=100${NC}"
    fi
    exit 0
fi

# Enable required APIs if not already enabled
echo -e "${YELLOW}🔧 Enabling required APIs...${NC}"
gcloud services enable run.googleapis.com --quiet
gcloud services enable cloudbuild.googleapis.com --quiet
gcloud services enable containerregistry.googleapis.com --quiet
gcloud services enable secretmanager.googleapis.com --quiet

# The backend serves and grades questions from backend/content/, a gitignored
# build artifact. Without it every question read 404s.
echo -e "${YELLOW}📦 Building content bundles...${NC}"
npm run build:content
if [ ! -f backend/content/catalog.json ]; then
    echo -e "${RED}❌ backend/content/catalog.json missing after build:content${NC}"
    exit 1
fi

echo -e "${YELLOW}🚀 Building and deploying a $TAG revision (0% traffic)...${NC}"
cd backend
gcloud builds submit --config cloudbuild.yaml --substitutions="_TAG=$TAG" .
cd ..

CANDIDATE_URL=$(tag_url)
if [ -z "$CANDIDATE_URL" ]; then
    echo -e "${RED}❌ Could not find the $TAG tag URL. Check: gcloud run services describe $SERVICE --region=$REGION${NC}"
    exit 1
fi
echo -e "Candidate: ${GREEN}$CANDIDATE_URL${NC}"

echo -e "${YELLOW}🧪 Smoke-testing the candidate...${NC}"
FAILED=0
check() {
    local path=$1
    local code
    code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 60 "$CANDIDATE_URL$path")
    if [ "$code" = "200" ]; then
        echo -e "${GREEN}✅ $path${NC}"
    else
        echo -e "${RED}❌ $path → $code${NC}"
        FAILED=1
    fi
}
check /health
check /api/v1/questions
check /api/v1/questions/two-sum

if [ "$FAILED" = "1" ]; then
    echo -e "${RED}❌ Candidate failed smoke tests. Live traffic is untouched.${NC}"
    echo -e "Logs: ${YELLOW}gcloud logging read 'resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE' --limit=50${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Candidate is healthy and serving 0% of traffic.${NC}"
echo -e "Try it: ${GREEN}$CANDIDATE_URL/api/v1/questions/two-sum${NC}"
echo -e "Go live: ${YELLOW}./deploy-to-cloudrun.sh --promote${NC}"
