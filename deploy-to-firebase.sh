#!/bin/bash

# Frontend Firebase Deployment Script
# This script builds and deploys the React frontend to Firebase Hosting

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="prepalgo"
FRONTEND_DIR="frontend"
BUILD_DIR="frontend/build"
DEPLOYMENT_TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

# Function to print colored output
print_status() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check Firebase project
check_firebase_project() {
    print_status "Checking Firebase project configuration..."
    
    if ! command_exists firebase; then
        print_error "Firebase CLI is not installed. Please install it first:"
        echo "npm install -g firebase-tools"
        exit 1
    fi
    
    # Check if user is logged in
    if ! firebase projects:list >/dev/null 2>&1; then
        print_error "Not logged in to Firebase. Please run:"
        echo "firebase login"
        exit 1
    fi
    
    # Check if project exists
    if ! firebase projects:list | grep -q "$PROJECT_NAME"; then
        print_error "Firebase project '$PROJECT_NAME' not found or you don't have access to it."
        exit 1
    fi
    
    print_success "Firebase project configuration verified"
}

# Function to setup environment variables
setup_environment() {
    print_status "Setting up environment variables..."
    
    # Create .env.production if it doesn't exist
    if [ ! -f "$FRONTEND_DIR/.env.production" ]; then
        print_warning "Creating .env.production file..."
        cat > "$FRONTEND_DIR/.env.production" << EOF
# Production environment variables
REACT_APP_API_BASE_URI=https://prep-algo-backend-419917211939.us-central1.run.app/api/v1
REACT_APP_ENVIRONMENT=production
EOF
        print_success "Created .env.production file"
    else
        print_success ".env.production file already exists"
    fi
    
    # Verify the API base URI is set correctly
    if grep -q "REACT_APP_API_BASE_URI" "$FRONTEND_DIR/.env.production"; then
        API_URI=$(grep "REACT_APP_API_BASE_URI" "$FRONTEND_DIR/.env.production" | cut -d'=' -f2)
        print_status "API Base URI: $API_URI"
    else
        print_warning "REACT_APP_API_BASE_URI not found in .env.production"
    fi
}

# Function to clean previous build
clean_build() {
    print_status "Cleaning previous build..."
    
    if [ -d "$BUILD_DIR" ]; then
        rm -rf "$BUILD_DIR"
        print_success "Cleaned previous build directory"
    else
        print_status "No previous build directory found"
    fi
}

# Function to install dependencies
install_dependencies() {
    print_status "Installing frontend dependencies..."
    
    cd "$FRONTEND_DIR"
    
    if [ ! -d "node_modules" ]; then
        print_status "Installing npm dependencies..."
        npm install
        print_success "Dependencies installed"
    else
        print_status "Checking for dependency updates..."
        npm install
        print_success "Dependencies up to date"
    fi
    
    cd ..
}

# Function to build the application
build_application() {
    print_status "Building React application..."
    
    cd "$FRONTEND_DIR"
    
    # Set environment to production
    export NODE_ENV=production
    
    # Build the application
    print_status "Running npm build..."
    npm run build
    
    # Check if build was successful
    if [ ! -d "build" ] || [ ! -f "build/index.html" ]; then
        print_error "Build failed! build directory or index.html not found"
        exit 1
    fi
    
    print_success "Build completed successfully"
    
    # Show build size
    BUILD_SIZE=$(du -sh build | cut -f1)
    print_status "Build size: $BUILD_SIZE"
    
    cd ..
}

# Function to test the build
test_build() {
    print_status "Testing build..."
    
    if [ ! -f "$BUILD_DIR/index.html" ]; then
        print_error "Build test failed: index.html not found"
        exit 1
    fi
    
    if [ ! -d "$BUILD_DIR/static" ]; then
        print_error "Build test failed: static directory not found"
        exit 1
    fi
    
    print_success "Build test passed"
}

# Function to deploy to Firebase
deploy_to_firebase() {
    print_status "Deploying to Firebase Hosting..."
    
    # Deploy to Firebase
    firebase deploy --only hosting --project "$PROJECT_NAME"
    
    if [ $? -eq 0 ]; then
        print_success "Deployment successful!"
    else
        print_error "Deployment failed!"
        exit 1
    fi
}

# Function to verify deployment
verify_deployment() {
    print_status "Verifying deployment..."
    
    # Get the hosting URL from Firebase
    HOSTING_URL=$(firebase hosting:channel:list --project "$PROJECT_NAME" 2>/dev/null | grep "live" | awk '{print $2}' || echo "https://$PROJECT_NAME.web.app")
    
    print_status "Deployed URL: $HOSTING_URL"
    
    # Test if the site is accessible
    if curl -s -o /dev/null -w "%{http_code}" "$HOSTING_URL" | grep -q "200"; then
        print_success "Deployment verification passed"
    else
        print_warning "Deployment verification failed - site might still be deploying"
    fi
}

# Function to show deployment summary
show_summary() {
    echo
    echo "🎉 Frontend Deployment Summary"
    echo "=============================="
    echo "Project: $PROJECT_NAME"
    echo "Deployment Time: $DEPLOYMENT_TIMESTAMP"
    echo "Build Directory: $BUILD_DIR"
    echo "Firebase Project: $PROJECT_NAME"
    
    # Get hosting URL
    HOSTING_URL=$(firebase hosting:channel:list --project "$PROJECT_NAME" 2>/dev/null | grep "live" | awk '{print $2}' || echo "https://$PROJECT_NAME.web.app")
    echo "Live URL: $HOSTING_URL"
    
    echo
    echo "🔗 Useful commands:"
    echo "View hosting details: firebase hosting:channel:list --project $PROJECT_NAME"
    echo "View deployment history: firebase hosting:releases:list --project $PROJECT_NAME"
    echo "Rollback deployment: firebase hosting:releases:rollback --project $PROJECT_NAME"
    
    echo
    print_success "Frontend deployment completed successfully!"
}

# Main deployment process
main() {
    echo "🚀 Starting Frontend Firebase Deployment"
    echo "========================================"
    echo "Project: $PROJECT_NAME"
    echo "Timestamp: $DEPLOYMENT_TIMESTAMP"
    echo
    
    # Check prerequisites
    check_firebase_project
    
    # Setup environment
    setup_environment
    
    # Clean and build
    clean_build
    install_dependencies
    build_application
    test_build
    
    # Deploy
    deploy_to_firebase
    verify_deployment
    
    # Show summary
    show_summary
}

# Handle script interruption
trap 'print_error "Deployment interrupted by user"; exit 1' INT TERM

# Run main function
main "$@" 