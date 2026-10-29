#!/usr/bin/env bash
# Deploys the budget kill-switch. Defaults to DRY_RUN=true (logs only).
# Arm it with: DRY_RUN=false scripts/budget-guard/deploy.sh
set -euo pipefail

PROJECT="${PROJECT:-prepalgo}"
REGION="${REGION:-us-central1}"
SERVICE="${SERVICE:-prep-algo-backend}"
SITE="${SITE:-prepalgo}"
BILLING_ACCOUNT="${BILLING_ACCOUNT:-015BF0-7C7A13-367A07}"
BUDGET_ID="${BUDGET_ID:-8b9f321c-72a0-4bba-a368-6126e81e4a2d}"
BUDGET_DISPLAY_NAME="${BUDGET_DISPLAY_NAME:-PrepAlgo monthly (~10 USD)}"
DRY_RUN="${DRY_RUN:-true}"
# Shutoff limit in the billing currency (INR); above the budget so emails warn first.
SHUTOFF_AMOUNT="${SHUTOFF_AMOUNT:-2000}"
TOPIC=prepalgo-budget-alerts
FUNCTION=prepalgo-budget-guard
SA="prepalgo-budget-guard@${PROJECT}.iam.gserviceaccount.com"
API_SA="prepalgo-api@${PROJECT}.iam.gserviceaccount.com"
DIR="$(cd "$(dirname "$0")" && pwd)"

[[ "$DRY_RUN" == true || "$DRY_RUN" == false ]] || { echo "DRY_RUN must be true or false" >&2; exit 1; }
[[ "$SHUTOFF_AMOUNT" =~ ^[1-9][0-9]*$ ]] || { echo "SHUTOFF_AMOUNT must be a positive integer" >&2; exit 1; }

gcloud services enable cloudfunctions.googleapis.com eventarc.googleapis.com pubsub.googleapis.com \
    cloudbuild.googleapis.com artifactregistry.googleapis.com billingbudgets.googleapis.com --project "$PROJECT"

gcloud iam service-accounts describe "$SA" --project "$PROJECT" >/dev/null 2>&1 ||
    gcloud iam service-accounts create prepalgo-budget-guard --project "$PROJECT" \
        --display-name "Budget kill-switch (Cloud Run ingress + Hosting disable)"
gcloud pubsub topics describe "$TOPIC" --project "$PROJECT" >/dev/null 2>&1 ||
    gcloud pubsub topics create "$TOPIC" --project "$PROJECT"

# Least privilege: update only the API service, act as its runtime identity
# (required to update a service), and publish a Hosting disable release.
gcloud run services add-iam-policy-binding "$SERVICE" --region "$REGION" --project "$PROJECT" \
    --member "serviceAccount:$SA" --role roles/run.developer --quiet >/dev/null
gcloud iam service-accounts add-iam-policy-binding "$API_SA" --project "$PROJECT" \
    --member "serviceAccount:$SA" --role roles/iam.serviceAccountUser --quiet >/dev/null
gcloud projects add-iam-policy-binding "$PROJECT" --member "serviceAccount:$SA" \
    --role roles/firebasehosting.admin --condition=None --quiet >/dev/null

gcloud functions deploy "$FUNCTION" --gen2 --project "$PROJECT" --region "$REGION" \
    --runtime nodejs22 --source "$DIR" --entry-point budgetGuard \
    --trigger-topic "$TOPIC" --trigger-service-account "$SA" --run-service-account "$SA" \
    --no-allow-unauthenticated --ingress-settings internal-only \
    --memory 256Mi --max-instances 1 --timeout 60s \
    --set-env-vars "DRY_RUN=$DRY_RUN,TARGET_PROJECT=$PROJECT,TARGET_REGION=$REGION,TARGET_SERVICE=$SERVICE,TARGET_SITE=$SITE,SHUTOFF_AMOUNT=$SHUTOFF_AMOUNT,BUDGET_DISPLAY_NAME=$BUDGET_DISPLAY_NAME"

gcloud run services add-iam-policy-binding "$FUNCTION" --region "$REGION" --project "$PROJECT" \
    --member "serviceAccount:$SA" --role roles/run.invoker --quiet >/dev/null

gcloud billing budgets update "$BUDGET_ID" --billing-account "$BILLING_ACCOUNT" \
    --notifications-rule-pubsub-topic "projects/$PROJECT/topics/$TOPIC"

echo "Budget guard deployed (DRY_RUN=$DRY_RUN, SHUTOFF_AMOUNT=$SHUTOFF_AMOUNT)."
