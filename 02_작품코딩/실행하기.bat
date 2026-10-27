@echo off
chcp 65001 >nul
cd /d "%~dp0"
py -3 --version >nul 2>nul
if %errorlevel% equ 0 (
  py -3 serve.py
) else (
  python serve.py
)
pause
