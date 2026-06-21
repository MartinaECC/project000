@echo off
setlocal

cd /d "%~dp0"

echo.
echo === DingTalk Smart Bot setup ===
echo Project: %CD%
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found.
  echo Please install Node.js 24 or newer, then run this file again:
  echo https://nodejs.org/
  echo.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm was not found. Please reinstall Node.js 24 or newer.
  echo.
  pause
  exit /b 1
)

for /f "usebackq delims=" %%v in (`node -p "process.versions.node"`) do set "NODE_VERSION=%%v"
for /f "tokens=1 delims=." %%m in ("%NODE_VERSION%") do set "NODE_MAJOR=%%m"

echo Node.js: %NODE_VERSION%
if %NODE_MAJOR% LSS 24 (
  echo [ERROR] This project requires Node.js 24 or newer.
  echo Please upgrade Node.js, then run this file again:
  echo https://nodejs.org/
  echo.
  pause
  exit /b 1
)

if not exist ".env" (
  if exist ".env.example" (
    copy ".env.example" ".env" >nul
    echo Created .env from .env.example.
  ) else (
    echo [WARN] .env.example was not found, so .env was not created.
  )
) else (
  echo .env already exists, leaving it unchanged.
)

echo.
echo Installing dependencies...
if exist "package-lock.json" (
  call npm ci
) else (
  call npm install
)
if errorlevel 1 (
  echo.
  echo [ERROR] Dependency installation failed.
  pause
  exit /b 1
)

echo.
echo Setup complete.
echo Common commands:
echo   npm test
echo   npm start
echo   npm run dev
echo   npm run refund-report:once
echo.
pause
