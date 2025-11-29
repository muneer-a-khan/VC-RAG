#!/bin/bash

# VC Copilot Startup Script
# This script starts both the backend and frontend services

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
pkill -f "uvicorn.*main:app" || true
pkill -f "npm run dev" || true
pkill -f "next dev" || true

# Check and clear ports
check_port 8001  # Backend port
check_port 3000  # Frontend port

# Start backend
echo -e "${BLUE}Starting backend server...${NC}"
cd backend
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8001 > ../backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}Backend started with PID: $BACKEND_PID${NC}"
cd ..

# Wait a moment for backend to initialize
sleep 3

# Check if backend is responding
if wait_for_service "http://localhost:8001/docs" "Backend API"; then
    echo -e "${GREEN}✓ Backend is running at http://localhost:8001${NC}"
    echo -e "${GREEN}✓ API docs available at http://localhost:8001/docs${NC}"
else
    echo -e "${RED}✗ Backend failed to start properly. Check backend.log for details.${NC}"
    exit 1
fi

# Start frontend
echo -e "${BLUE}Starting frontend server...${NC}"
cd frontend
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}Frontend started with PID: $FRONTEND_PID${NC}"
cd ..

# Wait for frontend to be ready
if wait_for_service "http://localhost:3000" "Frontend"; then
    echo -e "${GREEN}✓ Frontend is running at http://localhost:3000${NC}"
else
    echo -e "${RED}✗ Frontend failed to start properly. Check frontend.log for details.${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 VC Copilot is now running!${NC}"
echo ""
echo -e "${BLUE}Services:${NC}"
echo -e "  📊 Backend API:  http://localhost:8001"
echo -e "  🖥️  Frontend:     http://localhost:3000"
echo -e "  📚 API Docs:     http://localhost:8001/docs"
echo ""
echo -e "${YELLOW}Process IDs:${NC}"
echo -e "  Backend:  $BACKEND_PID"
echo -e "  Frontend: $FRONTEND_PID"
echo ""
echo -e "${YELLOW}To stop services, run: kill $BACKEND_PID $FRONTEND_PID${NC}"
echo -e "${YELLOW}Or use: pkill -f 'uvicorn.*main:app' && pkill -f 'npm run dev'${NC}"

# Save PIDs to a file for easy cleanup
echo "$BACKEND_PID" > .vc_pids
echo "$FRONTEND_PID" >> .vc_pids

echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"


