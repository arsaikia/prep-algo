# Deployment Scripts

This repository contains automated deployment scripts for both the backend (Google Cloud Run) and frontend (Firebase Hosting).

## 📋 Prerequisites

### Backend Deployment (Google Cloud Run)
- Google Cloud SDK installed and configured
- Docker installed
- Access to Google Cloud project `prepalgo`
- Required environment variables and secrets configured in Google Secret Manager

### Frontend Deployment (Firebase)
- Firebase CLI installed: `npm install -g firebase-tools`
- Firebase project access: `firebase login`
- Node.js and npm installed

## 🚀 Deployment Scripts

### Backend Deployment

#### Full Deployment Script (`deploy-to-cloudrun.sh`)
Comprehensive script with environment variable management, error handling, and detailed logging.

```bash
./deploy-to-cloudrun.sh
```

**Features:**
- ✅ Environment variable validation
- ✅ Secret management
- ✅ Cloud Build integration
- ✅ Health check verification
- ✅ Detailed status reporting
- ✅ Error handling and rollback info

#### Quick Deployment Script (`deploy-frontend-quick.sh`)
Simplified script for rapid deployments.

```bash
./deploy-frontend-quick.sh
```

**Features:**
- ✅ Fast deployment
- ✅ Minimal output
- ✅ Basic error handling

### Frontend Deployment

#### Full Deployment Script (`deploy-to-firebase.sh`)
Comprehensive script with build optimization, testing, and verification.

```bash
./deploy-to-firebase.sh
```

**Features:**
- ✅ Firebase project validation
- ✅ Environment setup
- ✅ Build optimization
- ✅ Deployment verification
- ✅ Detailed status reporting
- ✅ Build size analysis

#### Quick Deployment Script (`deploy-frontend-quick.sh`)
Simplified script for rapid frontend deployments.

```bash
./deploy-frontend-quick.sh
```

**Features:**
- ✅ Fast build and deploy
- ✅ Environment setup
- ✅ Minimal output

## 🔧 Setup Instructions

### 1. Install Dependencies

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Install Google Cloud SDK (if not already installed)
# Follow: https://cloud.google.com/sdk/docs/install
```

### 2. Authentication

```bash
# Firebase authentication
firebase login

# Google Cloud authentication
gcloud auth login
gcloud config set project prepalgo
```

### 3. Environment Configuration

The scripts automatically handle environment setup, but you can manually configure:

#### Backend Environment Variables
Required environment variables are managed through Google Secret Manager:
- `MONGO_URI`
- `JWT_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GITHUB_TOKEN`
- `CORS_ORIGINS`

#### Frontend Environment Variables
The scripts automatically create `frontend/.env.production`:
```env
REACT_APP_API_BASE_URI=https://prep-algo-backend-419917211939.us-central1.run.app/api/v1
REACT_APP_ENVIRONMENT=production
```

## 📊 Deployment URLs

### Backend (Google Cloud Run)
- **Service URL**: https://prep-algo-backend-419917211939.us-central1.run.app
- **API Base**: https://prep-algo-backend-419917211939.us-central1.run.app/api/v1

### Frontend (Firebase Hosting)
- **Live URL**: https://prepalgo.web.app
- **Project**: prepalgo

## 🔍 Monitoring and Troubleshooting

### Backend Monitoring
```bash
# View logs
gcloud logging read 'resource.type=cloud_run_revision AND resource.labels.service_name=prep-algo-backend' --limit=50

# Service details
gcloud run services describe prep-algo-backend --region=us-central1

# Update service
gcloud run services update prep-algo-backend --region=us-central1
```

### Frontend Monitoring
```bash
# View hosting details
firebase hosting:channel:list --project prepalgo

# View deployment history
firebase hosting:releases:list --project prepalgo

# Rollback deployment
firebase hosting:releases:rollback --project prepalgo
```

## 🚨 Common Issues and Solutions

### Backend Issues

#### Environment Variables Not Set
```bash
# Check if secrets exist
gcloud secrets list --project=prepalgo

# Create missing secrets
gcloud secrets create SECRET_NAME --data-file=secret.txt
```

#### Build Failures
```bash
# Check Cloud Build logs
gcloud builds log BUILD_ID

# Test locally
cd backend
npm install
npm start
```

### Frontend Issues

#### Firebase Not Logged In
```bash
firebase login
firebase projects:list
```

#### Build Failures
```bash
# Check build locally
cd frontend
npm install
npm run build
```

#### Environment Variables
```bash
# Verify .env.production exists
cat frontend/.env.production

# Check API endpoint
curl https://prep-algo-backend-419917211939.us-central1.run.app/health
```

## 🔄 CI/CD Integration

### GitHub Actions (Recommended)
Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy Backend
        run: ./deploy-to-cloudrun.sh

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy Frontend
        run: ./deploy-to-firebase.sh
```

### Manual Deployment Workflow
1. **Backend First**: Deploy backend to ensure API is available
2. **Frontend Second**: Deploy frontend with correct API endpoint
3. **Verify**: Test both deployments

```bash
# Complete deployment
./deploy-to-cloudrun.sh
./deploy-to-firebase.sh
```

## 📝 Script Customization

### Environment-Specific Deployments
Modify the scripts to support different environments:

```bash
# Development
./deploy-to-cloudrun.sh --env=dev

# Staging
./deploy-to-cloudrun.sh --env=staging

# Production
./deploy-to-cloudrun.sh --env=prod
```

### Custom Project Names
Update the `PROJECT_NAME` variable in each script:
```bash
PROJECT_NAME="your-project-name"
```

## 🔐 Security Considerations

- Environment variables are stored in Google Secret Manager
- Firebase project access is controlled by Firebase CLI authentication
- All deployments use HTTPS
- CORS is configured for specific origins only

## 📞 Support

For deployment issues:
1. Check the script output for error messages
2. Verify prerequisites are installed
3. Ensure proper authentication
4. Check service logs for detailed error information

---

**Last Updated**: $(date)
**Version**: 1.0.0 