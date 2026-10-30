#!/bin/bash

# Cloud Run Deployment Script
#
#   ./deploy-to-cloudrun.sh            build and deploy a "candidate" revision at
#                                      0% traffic, then smoke-test its tag URL
#   ./deploy-to-cloudrun.sh --promote REVISION  promote the exact tested candidate
#   ./deploy-to-cloudrun.sh --rollback REVISION move traffic back to an earlier,
#                                      PostgreSQL-compatible, ready revision
#
# Live traffic never moves until you promote, and the promote step prints the
# rollback command for the revision it replaced. Rollback never touches data;
# scripts/release/rollback.mjs refuses MongoDB-era revisions and revisions older
# than a contract migration (see DEPLOYMENT_README.md "Rollback"). Secrets are inherited;
# cloudbuild.yaml explicitly configures private executor networking and trust.

set -eo pipefail
cd "$(dirname "$0")"

SERVICE="prep-algo-backend"
REGION="us-central1"
TAG="candidate"

MODE="deploy"
case "$1" in
    "") ;;
    --promote) MODE="promote"; EXPECTED_REVISION="$2"
        if [ -z "$EXPECTED_REVISION" ]; then echo "Specify the exact tested revision"; exit 1; fi ;;
    --rollback) MODE="rollback"; EXPECTED_REVISION="$2"
        if [ -z "$EXPECTED_REVISION" ]; then echo "Specify the revision to roll back to"; exit 1; fi ;;
    *) echo "Usage: $0 [--promote REVISION | --rollback REVISION]"; exit 1 ;;
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
if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "(unset)" ]; then
    echo -e "${RED}❌ No project ID set. Please run: gcloud config set project YOUR_PROJECT_ID${NC}"
    exit 1
fi

echo -e "${BLUE}📋 Project ID: $PROJECT_ID${NC}"

# Application settings and secrets live on the service; cloudbuild.yaml sets
# candidate resource limits and private executor networking explicitly.
if ! gcloud run services describe "$SERVICE" --project="$PROJECT_ID" --region="$REGION" &> /dev/null; then
    echo -e "${RED}❌ Service $SERVICE not found in $REGION. Create it and set its env vars and secrets first.${NC}"
    exit 1
fi


tag_url() {
    gcloud run services describe "$SERVICE" --project="$PROJECT_ID" --region="$REGION" --format=json \
        | TAG="${1:-$TAG}" node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const t=(JSON.parse(s).status.traffic||[]).find(x=>x.tag===process.env.TAG);console.log(t&&t.url?t.url:"")})'
}

candidate_revision() {
    gcloud run services describe "$SERVICE" --project="$PROJECT_ID" --region="$REGION" --format=json \
        | TAG="$TAG" node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const t=(JSON.parse(s).status.traffic||[]).find(x=>x.tag===process.env.TAG);console.log(t?.revisionName||"")})'
}

if [ "$MODE" = "rollback" ]; then
    gcloud run revisions describe "$EXPECTED_REVISION" --project="$PROJECT_ID" --region="$REGION" --format=json \
        | node scripts/release/rollback.mjs check
    INGRESS=$(gcloud run services describe "$SERVICE" --project="$PROJECT_ID" --region="$REGION" --format='value(spec.template.metadata.annotations."run.googleapis.com/ingress",metadata.annotations."run.googleapis.com/ingress")' | tr '\t' '\n' | grep -v '^$' | tail -1)
    if [ "$INGRESS" = "internal" ]; then
        echo -e "${YELLOW}⚠️  Ingress is internal (maintenance); skipping the HTTP readiness probe.${NC}"
    else
        gcloud run services update-traffic "$SERVICE" --project="$PROJECT_ID" --region="$REGION" \
            --update-tags "rollback=$EXPECTED_REVISION" > /dev/null
        curl --fail --silent --show-error --max-time 60 "$(tag_url rollback)/health/ready" > /dev/null
        echo -e "${GREEN}✅ $EXPECTED_REVISION is ready${NC}"
    fi
    gcloud run services update-traffic "$SERVICE" --project="$PROJECT_ID" --region="$REGION" --to-revisions "$EXPECTED_REVISION=100"
    echo -e "${GREEN}✅ 100% of traffic now on $EXPECTED_REVISION. The database was not changed.${NC}"
    echo -e "If the frontend release depends on the newer API, roll Hosting back too: ${YELLOW}firebase hosting:rollback${NC} (Firebase console → Hosting → release history)."
    exit 0
fi

if [ "$MODE" = "promote" ]; then
    CURRENT_CANDIDATE=$(candidate_revision)
    if [ "$CURRENT_CANDIDATE" != "$EXPECTED_REVISION" ]; then
        echo "Candidate tag changed or is stale; refusing promotion"; exit 1
    fi
    PROJECT_ID="$PROJECT_ID" EXPECTED_REVISION="$EXPECTED_REVISION" node --input-type=module -e '
      import {readFileSync} from "node:fs";
      const receipt=JSON.parse(readFileSync(".cloudrun-candidate.json"));
      const content=JSON.parse(readFileSync("backend/content/catalog.json")).revision;
      const age=Date.now()-Date.parse(receipt.checkedAt);
      if(receipt.project!==process.env.PROJECT_ID || receipt.revision!==process.env.EXPECTED_REVISION ||
         receipt.content!==content || !Number.isFinite(age) || age<0 || age>86400000)
        throw new Error("Missing, changed or expired candidate acceptance receipt; redeploy/retest before promotion");
    '
    CANDIDATE_URL=$(tag_url)
    curl --fail --silent --show-error --max-time 60 "$CANDIDATE_URL/health/ready" > /dev/null
    curl --fail --silent --show-error --max-time 60 "$CANDIDATE_URL/health" \
      | EXPECTED_REVISION="$EXPECTED_REVISION" node --input-type=module -e '
        import {readFileSync} from "node:fs";
        const receipt=JSON.parse(readFileSync(".cloudrun-candidate.json"));
        let body="";for await(const chunk of process.stdin)body+=chunk;
        const health=JSON.parse(body);
        if(health.release?.revision!==process.env.EXPECTED_REVISION || health.release?.content!==receipt.content)
          throw new Error("Candidate release identity no longer matches acceptance");
      '
    PREVIOUS=$(gcloud run services describe "$SERVICE" --project="$PROJECT_ID" --region="$REGION" --format=json \
        | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const t=(JSON.parse(s).status.traffic||[]).filter(x=>x.percent>0).sort((a,b)=>b.percent-a.percent)[0];console.log(t?t.revisionName:"")})')
    gcloud run services update-traffic "$SERVICE" --project="$PROJECT_ID" --region="$REGION" --to-revisions "$EXPECTED_REVISION=100"
    echo -e "${GREEN}✅ 100% of traffic now on the $TAG revision${NC}"
    if [ -n "$PREVIOUS" ] && gcloud run revisions describe "$PREVIOUS" --project="$PROJECT_ID" --region="$REGION" --format=json \
        | node scripts/release/rollback.mjs check > /dev/null 2>&1; then
        echo -e "Roll back with: ${YELLOW}./deploy-to-cloudrun.sh --rollback $PREVIOUS${NC}"
    elif [ -n "$PREVIOUS" ]; then
        echo -e "${YELLOW}⚠️  $PREVIOUS is not a data-safe rollback target. If this release fails: node scripts/budget-guard/maintenance.mjs on, then fix forward.${NC}"
    fi
    exit 0
fi

# Enable required APIs if not already enabled
echo -e "${YELLOW}🔧 Enabling required APIs...${NC}"
gcloud services enable run.googleapis.com --project="$PROJECT_ID" --quiet
gcloud services enable cloudbuild.googleapis.com --project="$PROJECT_ID" --quiet
gcloud services enable containerregistry.googleapis.com --project="$PROJECT_ID" --quiet
gcloud services enable secretmanager.googleapis.com --project="$PROJECT_ID" --quiet

# The backend serves and grades questions from backend/content/, a gitignored
# build artifact. Without it every question read 404s.
echo -e "${YELLOW}📦 Building content bundles...${NC}"
npm run build:content
if [ ! -f backend/content/catalog.json ]; then
    echo -e "${RED}❌ backend/content/catalog.json missing after build:content${NC}"
    exit 1
fi

# Also lints migrations for rollback-breaking changes; labels the revision with
# the schema it was built for so later contract migrations can retire it.
SCHEMA=$(node scripts/release/rollback.mjs schema)

echo -e "${YELLOW}🚀 Building and deploying a $TAG revision (0% traffic)...${NC}"
cd backend
gcloud builds submit --project="$PROJECT_ID" --config cloudbuild.yaml --substitutions="_TAG=$TAG,_SCHEMA=$SCHEMA" .
cd ..

CANDIDATE_URL=$(tag_url)
CANDIDATE_REVISION=$(candidate_revision)
if [ -z "$CANDIDATE_URL" ] || [ -z "$CANDIDATE_REVISION" ]; then
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
check /health/ready
check /api/v1/questions
check /api/v1/questions/two-sum

# /health answers 200 even when Redis is down (the backend falls back to memory),
# so print the component statuses rather than trusting the code alone.
HEALTH=$(curl -s --max-time 30 "$CANDIDATE_URL/health")
printf '%s' "$HEALTH" | CANDIDATE_REVISION="$CANDIDATE_REVISION" node --input-type=module -e '
    import {readFileSync} from "node:fs";
    let body="";for await(const chunk of process.stdin)body+=chunk;
    const health=JSON.parse(body);
    const expected=JSON.parse(readFileSync("backend/content/catalog.json")).revision;
    if(health.release?.revision!==process.env.CANDIDATE_REVISION || health.release?.content!==expected)
      throw new Error("Candidate revision/content does not match the built release");
'
for component in postgres redis; do
    status=$(printf '%s' "$HEALTH" | sed -n "s/.*\"$component\":{\"status\":\"\([a-z]*\)\".*/\1/p")
    echo -e "   $component: ${YELLOW}${status:-unknown}${NC}"
done

if [ "$FAILED" = "1" ]; then
    echo -e "${RED}❌ Candidate failed smoke tests. Live traffic is untouched.${NC}"
    echo -e "Logs: ${YELLOW}gcloud logging read 'resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE' --limit=50${NC}"
    exit 1
fi

PROJECT_ID="$PROJECT_ID" CANDIDATE_REVISION="$CANDIDATE_REVISION" node --input-type=module -e '
    import {readFileSync,writeFileSync} from "node:fs";
    const content=JSON.parse(readFileSync("backend/content/catalog.json")).revision;
    writeFileSync(".cloudrun-candidate.json",JSON.stringify({
      project:process.env.PROJECT_ID,revision:process.env.CANDIDATE_REVISION,
      content,checkedAt:new Date().toISOString()
    },null,2)+"\n");
'
echo ""
echo -e "${GREEN}✅ Candidate is healthy and serving 0% of traffic.${NC}"
echo -e "Try it: ${GREEN}$CANDIDATE_URL/api/v1/questions/two-sum${NC}"
echo -e "Go live after authenticated acceptance: ${YELLOW}./deploy-to-cloudrun.sh --promote $CANDIDATE_REVISION${NC}"
