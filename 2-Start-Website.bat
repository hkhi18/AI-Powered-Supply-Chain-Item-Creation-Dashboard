@echo off
REM Starts the SCM Item Creation website on http://localhost:3002
cd /d "%~dp0"
set "PATH=%USERPROFILE%\nodejs;C:\Program Files\nodejs;%PATH%"
if not exist "pgdata" (
  echo Database not found - building it first...
  node scripts\seed.mjs
)
if not exist ".next" call npm run build
set PORT=3002
start "" cmd /c "timeout /t 5 >nul & start http://localhost:3002"
echo  Website running at http://localhost:3002  (keep this window open, close it to stop)
call npx next start -p 3002
pause
