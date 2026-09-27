@echo off
chcp 65001 >nul
echo ====================================
echo   Starting Python Bekalut...
echo ====================================
cd /d "%~dp0"
call venv\Scripts\activate.bat
python main.py
pause
