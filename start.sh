#!/bin/bash

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

echo -e "${BLUE}=========================================="
echo -e " Math Homework Grading System - Launcher"
echo -e "==========================================${NC}"
echo ""

echo -e "${YELLOW}[1/4] Checking system files...${NC}"
echo ""

# Check if index.html exists
if [ -f "$SCRIPT_DIR/index.html" ]; then
    echo -e "${GREEN}[OK]${NC} System files found"
    HAS_HTML=1
else
    echo -e "${RED}[ERROR]${NC} index.html not found"
    HAS_HTML=0
    exit 1
fi

# Check if package.json exists
if [ -f "$SCRIPT_DIR/package.json" ]; then
    echo -e "${GREEN}[OK]${NC} Package configuration found"
    HAS_PKG=1
else
    echo -e "${RED}[ERROR]${NC} package.json not found"
    HAS_PKG=0
    exit 1
fi

echo ""
echo -e "${YELLOW}[2/4] Checking Node.js...${NC}"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR]${NC} Node.js is not installed"
    echo ""
    echo "Please install Node.js from: https://nodejs.org/"
    echo ""
    exit 1
else
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}[OK]${NC} Node.js version: $NODE_VERSION"
fi

echo ""
echo -e "${YELLOW}[3/4] Checking npm...${NC}"
echo ""

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo -e "${RED}[ERROR]${NC} npm is not available"
    exit 1
else
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}[OK]${NC} npm version: $NPM_VERSION"
fi

echo ""
echo -e "${YELLOW}[4/4] Starting proxy server...${NC}"
echo ""

# Check if node_modules exists
if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
    echo "Installing dependencies..."
    echo "This may take a few minutes..."
    cd "$SCRIPT_DIR"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}[ERROR]${NC} Failed to install dependencies"
        exit 1
    fi
    echo -e "${GREEN}[OK]${NC} Dependencies installed"
else
    echo -e "${GREEN}[OK]${NC} Dependencies already installed"
fi

# Kill any existing server on port 3000
echo ""
echo "Checking for existing processes on port 3000..."
PORT_PID=$(lsof -ti:3000 2>/dev/null)
if [ ! -z "$PORT_PID" ]; then
    echo "Found process $PORT_PID on port 3000, terminating..."
    kill -9 $PORT_PID 2>/dev/null
    sleep 1
fi

# Start the proxy server
echo ""
echo "Starting proxy server..."
echo "Server will be available at: http://localhost:3000"
echo ""

cd "$SCRIPT_DIR"

# Start server in background
nohup node server.js > server.log 2>&1 &
SERVER_PID=$!
echo $SERVER_PID > server.pid

# Wait for server to start
echo "Waiting for server to start..."
sleep 5

# Check if server is running
SERVER_CHECK=0
for i in {1..10}; do
    echo "Checking server status (attempt $i/10)..."
    if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
        SERVER_CHECK=1
        break
    fi
    sleep 2
done

if [ $SERVER_CHECK -eq 1 ]; then
    echo ""
    echo -e "${GREEN}[OK]${NC} Proxy server is running"
    echo ""
else
    echo ""
    echo -e "${YELLOW}[WARNING]${NC} Server may still be starting..."
    echo "Please wait a moment and try refreshing the page if it doesn't load."
    echo ""
fi

# Try to open browser (optional)
if command -v xdg-open &> /dev/null; then
    echo "Opening browser..."
    xdg-open "http://localhost:3000/index.html" &> /dev/null &
elif command -v gnome-open &> /dev/null; then
    echo "Opening browser..."
    gnome-open "http://localhost:3000/index.html" &> /dev/null &
fi

echo ""
echo -e "${GREEN}=========================================="
echo -e "[OK] System started successfully"
echo -e "==========================================${NC}"
echo ""
echo "Frontend: http://localhost:3000/index.html"
echo "API:      http://localhost:3000/api"
echo ""
echo "Notes:"
echo "  - Server PID: $SERVER_PID (saved in server.pid)"
echo "  - Server log: server.log"
echo "  - To stop the system, run: ./stop.sh"
echo ""
echo "Press Enter to exit..."
read
