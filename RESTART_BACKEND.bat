@echo off
title LyangPOS - Restart Backend
echo ========================================
echo DANG KHOI DONG LAI BACKEND...
echo ========================================

set PORT=6719

echo [1/2] Dang dung process cu trên port %PORT%...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :%PORT% ^| findstr LISTENING') do (
    echo Dang tat PID: %%a
    taskkill /f /pid %%a
)

echo [2/2] Dang khoi dong Backend moi...
if exist .venv (
    start "Backend Server" cmd /c "cd backend && ..\.venv\Scripts\python app.py"
) else (
    start "Backend Server" cmd /c "cd backend && python app.py"
)

echo ========================================
echo DA RESTART BACKEND THANH CONG!
echo ========================================
timeout /t 3
exit
