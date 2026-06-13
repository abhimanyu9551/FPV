@echo off
title FPV Telegram Bot
cd /d "%~dp0"
echo Starting FPV Telegram Bot...
.venv\Scripts\python.exe -m src.main
echo Bot exited. Press any key to close.
pause
