# Deployment Scripts

Automated deployment scripts for backend (Google Cloud Run) and frontend (Firebase Hosting).

## Prerequisites

### Backend (Google Cloud Run)
- Google Cloud SDK installed and configured
- Docker installed
- Access to Google Cloud project `prepalgo`
- Secrets configured in Google Secret Manager

### Frontend (Firebase Hosting)
- Firebase CLI: `npm install -g firebase-tools`
- Firebase project access: `firebase login`

## Deployment Scripts

### Backend: `deploy-to-cloudrun.sh`

Deploys backend to Cloud Run with secret management, health checks, and error handling.

```bash
./deploy-to-cloudrun.sh
```

### Frontend: `deploy-to-firebase.sh`

Full deployment with build validation, environment setup, and verification.

```bash
./deploy-to-firebase.sh
```

### Frontend Quick: `deploy-frontend-quick.sh`

Simplified script for rapid frontend deployments.

```bash
./deploy-frontend-quick.sh
```

## Environment Configuration

### Backend Secrets (Google Secret Manager)
- `MONGO_URI`
- `JWT_SECRET`
- `GOOGLE_CLIENT_ID`

### Frontend Environment
Scripts auto-create `frontend/.env.production`:
```env
VITE_API_BASE_URI=https://prep-algo-backend-419917211939.us-central1.run.app/api/v1
```

## Deployment URLs

- **Backend**: https://prep-algo-backend-419917211939.us-central1.run.app/api/v1
- **Frontend**: https://prepalgo.web.app

## Monitoring

### Backend
```bash
gcloud logging read 'resource.type=cloud_run_revision AND resource.labels.service_name=prep-algo-backend' --limit=50
gcloud run services describe prep-algo-backend --region=us-central1
```

### Frontend
```bash
firebase hosting:releases:list --project prepalgo
firebase hosting:releases:rollback --project prepalgo
```

## Deployment Order

1. Deploy backend first: `./deploy-to-cloudrun.sh`
2. Deploy frontend second: `./deploy-to-firebase.sh`
3. Verify both at their URLs
