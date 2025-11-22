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
echo -e " Math Homework Grading System - Stop Script"
echo -e "==========================================${NC}"
echo ""

# Check if server.pid exists
if [ -f "$SCRIPT_DIR/server.pid" ]; then
    SERVER_PID=$(cat "$SCRIPT_DIR/server.pid")
    echo -e "${YELLOW}Found server PID: $SERVER_PID${NC}"

    # Check if process is running
    if ps -p $SERVER_PID > /dev/null 2>&1; then
        echo "Terminating server process..."
        kill -TERM $SERVER_PID 2>/dev/null

        # Wait for graceful shutdown
        sleep 2

        # Force kill if still running
        if ps -p $SERVER_PID > /dev/null 2>&1; then
            echo "Force killing process..."
            kill -9 $SERVER_PID 2>/dev/null
        fi

        echo -e "${GREEN}[OK]${NC} Server stopped successfully"
    else
        echo -e "${YELLOW}[WARNING]${NC} Process $SERVER_PID is not running"
    fi

    # Remove PID file
    rm -f "$SCRIPT_DIR/server.pid"
else
    echo -e "${YELLOW}[INFO]${NC} No PID file found"
fi

# Also kill any processes on port 3000
echo ""
echo "Checking for processes on port 3000..."
PORT_PID=$(lsof -ti:3000 2>/dev/null)

if [ ! -z "$PORT_PID" ]; then
    echo "Found process $PORT_PID on port 3000, terminating..."
    kill -9 $PORT_PID 2>/dev/null
    sleep 1

    # Verify port is free
    if lsof -ti:3000 2>/dev/null; then
        echo -e "${RED}[WARNING]${NC} Port 3000 may still be in use"
    else
        echo -e "${GREEN}[OK]${NC} Port 3000 is now free"
    fi
else
    echo -e "${GREEN}[OK]${NC} Port 3000 is already free"
fi

echo ""
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}Math Grading System stopped${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""
echo "To start the system again, run: ./start.sh"
echo ""
