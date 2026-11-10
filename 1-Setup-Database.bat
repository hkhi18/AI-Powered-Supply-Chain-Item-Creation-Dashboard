@echo off
REM Builds the database (UNSPSC codes + example items). Run once.
cd /d "%~dp0"
set "PATH=%USERPROFILE%\nodejs;C:\Program Files\nodejs;%PATH%"
echo.
echo  Building the database (about 1 minute)...
echo  Close the website window first if it is running.
echo.
call npm install
node scripts\seed.mjs
echo.
echo  Finished. Now double-click 2-Start-Website.bat
pause
