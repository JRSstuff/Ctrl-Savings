@echo off
cd /d "%~dp0"

if not exist "node_modules\" (
  echo [!] Dependencies missing. Running npm install...
  call npm install
  if errorlevel 1 (
    echo [ERROR] Failed to install dependencies.
    pause
    exit /b %errorlevel%
  )
)

echo ====================================================
echo Building the App for Production PWA Offline Testing...
echo ====================================================
call npm run build

echo.
echo ====================================================
echo Starting Production Preview Server...
echo ====================================================
echo OPEN your browser to http://localhost:4173
echo Let the page load once so the Service Worker caches everything.
echo Then, press Ctrl+C in this terminal to stop the server.
echo Refresh the page in your browser. It will load instantly offline!
echo ====================================================
call npm run preview -- --host --open
