@echo off
title Ctrl+Savings Dev Server
cd /d "%~dp0"

echo ===================================================
echo   Ctrl+Savings - Development Server
echo ===================================================
echo.

if not exist "node_modules\" (
  echo [!] Dependencies missing. Running npm install...
  call npm install
  if errorlevel 1 (
    echo [ERROR] Failed to install dependencies.
    pause
    exit /b %errorlevel%
  )
)

echo Starting dev server and opening browser...
echo (Exposing to local network for phone testing)
echo.

call npm run dev -- --open --host

if errorlevel 1 (
  echo.
  echo [ERROR] Dev server stopped with an error.
  pause
)
