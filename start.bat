@echo off
title Math Homework Grading System

echo ==========================================
echo  Math Homework Grading System - Launcher
echo ==========================================
echo.

:: Get script directory
set "SCRIPT_DIR=%~dp0"
set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"

echo [1/4] Checking system files...
echo.

:: Check if index.html exists
if exist "%SCRIPT_DIR%\index.html" (
    echo [OK] System files found
    set "HAS_HTML=1"
) else (
    echo [ERROR] index.html not found
    set "HAS_HTML=0"
    goto :error
)

:: Check if package.json exists
if exist "%SCRIPT_DIR%\package.json" (
    echo [OK] Package configuration found
    set "HAS_PKG=1"
) else (
    echo [ERROR] package.json not found
    set "HAS_PKG=0"
    goto :error
)

echo.
echo [2/4] Checking Node.js...
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo [OK] Node.js version: %NODE_VERSION%
)

echo.
echo [3/4] Checking npm...
echo.

:: Check if npm is available
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm is not available
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
    echo [OK] npm version: %NPM_VERSION%
)

echo.
echo [4/4] Starting proxy server...
echo.

:: Check if node_modules exists
if not exist "%SCRIPT_DIR%\node_modules" (
    echo Installing dependencies...
    echo This may take a few minutes...
    cd /d "%SCRIPT_DIR%"
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
    echo [OK] Dependencies installed
) else (
    echo [OK] Dependencies already installed
)

:: Kill any existing server on port 3000
echo Checking for existing processes on port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    echo Found process %%a on port 3000, terminating...
    taskkill /PID %%a /F >nul 2>&1
)
timeout /t 1 /nobreak >nul

:: Start the proxy server
echo.
echo Starting proxy server...
echo Server will be available at: http://localhost:3000
echo.

cd /d "%SCRIPT_DIR%"
start "MathGrading-Proxy" cmd /k "title Proxy Server && node server.js"

:: Wait for server to start
echo Waiting for server to start...
timeout /t 5 /nobreak >nul

:: Check if server is running
set "SERVER_CHECK=0"
for /l %%i in (1,1,10) do (
    echo Checking server status (attempt %%i/10)...
    powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3000/api/health' -UseBasicParsing -TimeoutSec 2; if($response.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
    if %errorlevel% equ 0 (
        set "SERVER_CHECK=1"
        goto :server_ready
    )
    timeout /t 2 /nobreak >nul
)

:server_ready
if %SERVER_CHECK% equ 1 (
    echo.
    echo [OK] Proxy server is running
    echo.
) else (
    echo.
    echo [WARNING] Server may still be starting...
    echo Please wait a moment and try refreshing the page if it doesn't load.
    echo.
)

:: Open browser
echo Opening browser...
start "" "http://localhost:3000/index.html"

echo.
echo ==========================================
echo [OK] System started successfully
echo ==========================================
echo.
echo Frontend: http://localhost:3000/index.html
echo API:      http://localhost:3000/api
echo.
echo Notes:
echo  - Keep this window open to keep the system running
echo  - Close this window to stop the system
echo  - If the page doesn't load, wait a few seconds and refresh
echo.
echo Press any key to close this window...
pause >nul
exit /b 0

:error
echo.
echo ==========================================
echo [ERROR] System failed to start
echo ==========================================
echo.
echo Please check the error messages above.
echo.
pause
exit /b 1
