@echo off
cd /d "%~dp0"
if not exist "node_modules\vite\bin\vite.js" (
 echo Run the installation script first.
 pause
 exit /b 1
)
if not exist "dist\index.html" (
 call npm.cmd run build
 if errorlevel 1 exit /b 1
)
echo Open http://127.0.0.1:4173/ in Chrome or Edge.
echo Keep this window open. Press Ctrl+C to stop.
call npm.cmd run preview -- --port 4173 --strictPort
pause
