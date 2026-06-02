@echo off
REM Deploy script for Loop ERP - Windows (No Docker)
REM FE + BE cùng 1 server Windows

setlocal enabledelayedexpansion

echo.
echo ========================================
echo   LOOP ERP - Deploy to Windows Server
echo ========================================
echo.

REM Get current directory
set DEPLOY_DIR=%~dp0
set ROOT_DIR=%DEPLOY_DIR:~0,-8%
set FE_DIR=%ROOT_DIR%apps\web
set BE_DIR=%ROOT_DIR%apps\backend
set OUTPUT_DIR=%DEPLOY_DIR%output

echo [1/6] Checking prerequisites...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found. Please install Node.js 20+ first.
    echo Download: https://nodejs.org
    exit /b 1
)

where git >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Git not found. Please install Git first.
    exit /b 1
)

echo [OK] Node.js found:
node --version
echo [OK] Git found:
git --version
echo.

REM Create output directory
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"
if not exist "%OUTPUT_DIR%\fe" mkdir "%OUTPUT_DIR%\fe"
if not exist "%OUTPUT_DIR%\be" mkdir "%OUTPUT_DIR%\be"

echo [2/6] Building Frontend...
cd /d "%FE_DIR%"
if exist "node_modules" (
    echo Frontend dependencies already installed, skipping npm install...
) else (
    echo Installing frontend dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo ERROR: Frontend install failed
        exit /b 1
    )
)

echo Building frontend...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Frontend build failed
    exit /b 1
)

echo [OK] Frontend built successfully
echo Copying frontend dist to output...
REM Copy dist files
for /d %%i in ("%FE_DIR%\dist\*") do (
    xcopy "%%i" "%OUTPUT_DIR%\fe\" /E /I /Y
)
for %%i in ("%FE_DIR%\dist\*") do (
    if not "%%~xi"=="" copy "%%i" "%OUTPUT_DIR%\fe\" /Y
)
echo.

echo [3/6] Building Backend...
cd /d "%BE_DIR%"
if exist "node_modules" (
    echo Backend dependencies already installed, skipping npm install...
) else (
    echo Installing backend dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo ERROR: Backend install failed
        exit /b 1
    )
)

echo Building backend...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Backend build failed
    exit /b 1
)

echo [OK] Backend built successfully
echo Copying backend dist to output...
xcopy "%BE_DIR%\dist" "%OUTPUT_DIR%\be\dist" /E /I /Y
xcopy "%BE_DIR%\node_modules" "%OUTPUT_DIR%\be\node_modules" /E /I /Y

REM Copy .env if exists
if exist "%BE_DIR%\.env" (
    copy "%BE_DIR%\.env" "%OUTPUT_DIR%\be\.env" /Y
)

echo.

echo [4/6] Creating helper scripts...

REM Create start-fe.bat
(
    echo @echo off
    echo cd /d "%OUTPUT_DIR%\fe"
    echo echo Starting Frontend server on http://localhost:5173
    echo REM For production, use: npx http-server . -p 5173 -c-1
    echo npx http-server . -p 5173 -c-1
) > "%OUTPUT_DIR%\start-fe.bat"

REM Create start-be.bat
(
    echo @echo off
    echo cd /d "%OUTPUT_DIR%\be"
    echo echo Starting Backend server on http://localhost:3000
    echo node dist/main.js
) > "%OUTPUT_DIR%\start-be.bat"

REM Create start-all.bat
(
    echo @echo off
    echo echo.
    echo echo Starting Loop ERP...
    echo echo.
    echo start "Loop Frontend" cmd /k "%OUTPUT_DIR%\start-fe.bat"
    echo timeout /t 2
    echo start "Loop Backend" cmd /k "%OUTPUT_DIR%\start-be.bat"
    echo echo.
    echo echo Servers starting in new windows...
    echo echo Frontend: http://localhost:5173
    echo echo Backend: http://localhost:3000
    echo echo.
) > "%OUTPUT_DIR%\start-all.bat"

echo [OK] Helper scripts created
echo.

echo [5/6] Preparing deployment package...

REM Create deploy info file
(
    echo ## Loop ERP Deployment Info
    echo.
    echo Deployed: %date% %time%
    echo.
    echo ### Frontend
    echo - Location: %OUTPUT_DIR%\fe
    echo - Type: Static files ^(Vite build output^)
    echo - Port: 5173
    echo - Start: start-fe.bat
    echo.
    echo ### Backend
    echo - Location: %OUTPUT_DIR%\be
    echo - Type: Node.js NestJS app
    echo - Port: 3000
    echo - Start: start-be.bat
    echo.
    echo ### Quick Start
    echo 1. Open Command Prompt in this directory
    echo 2. Run: start-all.bat
    echo 3. Open browser: http://localhost:5173
    echo.
) > "%OUTPUT_DIR%\DEPLOY_INFO.txt"

echo [OK] Deployment package ready
echo.

echo [6/6] Creating .env template for server...
if not exist "%OUTPUT_DIR%\be\.env" (
    copy "%BE_DIR%\.env.example" "%OUTPUT_DIR%\be\.env" /Y 2>nul
    echo [OK] .env template created
    echo Please update %OUTPUT_DIR%\be\.env with server values
) else (
    echo [OK] .env already exists, skipping
)

echo.
echo ========================================
echo   DEPLOYMENT COMPLETE
echo ========================================
echo.
echo Deploy folder: %OUTPUT_DIR%
echo.
echo To start servers:
echo   1. Open Command Prompt in: %OUTPUT_DIR%
echo   2. Run: start-all.bat
echo.
echo Or start individually:
echo   - Frontend: start-fe.bat
echo   - Backend: start-be.bat
echo.
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:3000
echo.
echo Press any key to exit...
pause >nul
