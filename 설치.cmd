@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Please install Node.js 24 LTS from https://nodejs.org/
 pause
 exit /b 1
)
call npm.cmd ci
if errorlevel 1 (
 pause
 exit /b 1
)
call npm.cmd run build
if errorlevel 1 (
 pause
 exit /b 1
)
echo Installation complete. Run the exhibition launcher next.
pause
