@echo off
cd /d %~dp0

echo Checking port 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000 "') do (
    echo Killing PID %%a on port 3000
    taskkill /PID %%a /F >nul 2>&1
)

timeout /t 1 /nobreak >nul
start "" "http://localhost:3000"
cmd /k pnpm dev
