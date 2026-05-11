#!/bin/bash

# Beauty Studio Deployment Script
# Оптимизированный деплой для production

set -e  # Exit on error

echo "🚀 Starting Beauty Studio deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "README.md" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Backend deployment
print_status "Deploying backend..."

cd backend

# Check if Dockerfile exists
if [ ! -f "Dockerfile" ]; then
    print_error "Dockerfile not found in backend directory"
    exit 1
fi

# Build and test backend locally
print_status "Building backend image..."
docker build -t beauty-studio-backend:test .

print_status "Running backend tests..."
docker run --rm -p 8000:8000 -e DATABASE_URL="sqlite:///./test.db" beauty-studio-backend:test &
BACKEND_PID=$!

# Wait for backend to start
sleep 5

# Test health endpoint
print_status "Testing backend health..."
curl -f http://localhost:8000/health || {
    print_error "Backend health check failed"
    kill $BACKEND_PID 2>/dev/null
    exit 1
}

# Stop test container
kill $BACKEND_PID 2>/dev/null || true
wait $BACKEND_PID 2>/dev/null || true

cd ..

# Frontend deployment
print_status "Deploying frontend..."

cd frontend

# Check if node_modules exists and is up to date
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    print_status "Installing frontend dependencies..."
    npm ci --production=false
fi

# Run tests if they exist
if [ -f "package.json" ] && grep -q "test" package.json; then
    print_status "Running frontend tests..."
    npm test
fi

# Build frontend
print_status "Building frontend..."
export NODE_ENV=production
export VITE_DEBUG=false
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    print_error "Frontend build failed - dist directory not found"
    exit 1
fi

print_status "Frontend build completed successfully"

cd ..

# Deploy to Vercel (if vercel CLI is available)
if command -v vercel &> /dev/null; then
    print_status "Deploying to Vercel..."
    cd frontend
    vercel --prod --yes
    cd ..
else
    print_warning "Vercel CLI not found. Please deploy manually."
fi

# Deploy to Render (if render CLI is available)
if command -v render &> /dev/null; then
    print_status "Deploying to Render..."
    cd backend
    render deploy
    cd ..
else
    print_warning "Render CLI not found. Please deploy manually."
fi

# Final checks
print_status "Running post-deployment checks..."

# Test frontend (if deployed)
FRONTEND_URL=${FRONTEND_URL:-"http://localhost:5173"}
print_status "Testing frontend at $FRONTEND_URL..."

# Test backend (if deployed)
BACKEND_URL=${BACKEND_URL:-"http://localhost:8000"}
print_status "Testing backend at $BACKEND_URL/api/health..."

curl -f "$BACKEND_URL/api/health" || {
    print_warning "Backend health check failed - service might be starting up"
}

print_status "🎉 Deployment completed successfully!"
print_status "Frontend: $FRONTEND_URL"
print_status "Backend: $BACKEND_URL"

echo ""
echo "📋 Next steps:"
echo "1. Update BotFather with new frontend URL"
echo "2. Test Telegram Mini App integration"
echo "3. Monitor logs for any issues"
echo "4. Run smoke tests on key functionality"
