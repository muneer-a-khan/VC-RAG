#!/bin/bash

# VC Copilot Startup Script
# This script starts the Next.js application (frontend + API routes)
# Note: The backend was migrated to Next.js API routes (see MIGRATION_COMPLETE.md)

set -e  # Exit on any error

echo "🚀 Starting VC Copilot..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}Port $port is already in use. Killing existing processes...${NC}"
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1

    echo -e "${BLUE}Waiting for $service_name to be ready...${NC}"

    while [ $attempt -le $max_attempts ]; do
        if curl -s --head --fail "$url" >/dev/null 2>&1; then
            echo -e "${GREEN}✓ $service_name is ready!${NC}"
            return 0
        fi
        echo -n "."
        sleep 1
        ((attempt++))
    done

    echo -e "${RED}✗ $service_name failed to start within ${max_attempts}s${NC}"
    return 1
}

# Kill any existing processes
echo -e "${YELLOW}Cleaning up existing processes...${NC}"
pkill -f "npm run dev" || true
pkill -f "next dev" || true

# Check and clear ports
check_port 3000  # Next.js port

# Check for required environment variables
if [ -f "frontend/.env.local" ]; then
    echo -e "${GREEN}✓ Found .env.local${NC}"
else
    if [ -f "frontend/env.local.template" ]; then
        echo -e "${YELLOW}⚠ No .env.local found. Creating from template...${NC}"
        cp frontend/env.local.template frontend/.env.local
        echo -e "${YELLOW}⚠ Please update frontend/.env.local with your configuration${NC}"
    else
        echo -e "${YELLOW}⚠ No .env.local found. Create one with required environment variables.${NC}"
    fi
fi

# Start Next.js application (includes both frontend and API routes)
echo -e "${BLUE}Starting Next.js application...${NC}"
cd frontend

# Ensure dependencies are installed
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}Installing dependencies...${NC}"
    npm install
fi

# Generate Prisma client if needed
if [ ! -d "node_modules/.prisma" ]; then
    echo -e "${BLUE}Generating Prisma client...${NC}"
    npx prisma generate
fi

# Start the development server
npm run dev > ../frontend.log 2>&1 &
APP_PID=$!
echo -e "${GREEN}Next.js started with PID: $APP_PID${NC}"
cd ..

# Wait for the application to be ready
if wait_for_service "http://localhost:3000" "VC Copilot"; then
    echo -e "${GREEN}✓ Application is running at http://localhost:3000${NC}"
else
    echo -e "${RED}✗ Application failed to start properly. Check frontend.log for details.${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 VC Copilot is now running!${NC}"
echo ""
echo -e "${BLUE}Services:${NC}"
echo -e "  🖥️  Application:  http://localhost:3000"
echo -e "  🔐 Auth:         http://localhost:3000/api/auth"
echo -e "  💬 Chat API:     http://localhost:3000/api/chat"
echo -e "  📁 Projects:     http://localhost:3000/api/projects"
echo ""
echo -e "${YELLOW}Process ID: $APP_PID${NC}"
echo ""
echo -e "${YELLOW}To stop the service, run: kill $APP_PID${NC}"
echo -e "${YELLOW}Or use: pkill -f 'next dev'${NC}"

# Save PID to a file for easy cleanup
echo "$APP_PID" > .vc_pids

echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"
