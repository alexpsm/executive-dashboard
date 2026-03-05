@echo off
echo Starting Executive Dashboard in Production Mode...
echo 1. Cleaning old build...
if exist ".next" rmdir /s /q .next

echo 2. Building application...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo Build failed!
    pause
    exit /b %ERRORLEVEL%
)

echo 3. Starting server...
echo Access the dashboard at http://localhost:3000
call npm start
pause
