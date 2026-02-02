@echo off
title LyangPOS - Khoi dong ung dung (Dev Mode)
echo ========================================
echo DANG KHOI DONG LYANGPOS
echo ========================================

echo [1/2] Dang khoi dong Backend...
:: Kiem tra virtual environment
if exist .venv (
    start "Backend Server" cmd /c "cd backend && ..\.venv\Scripts\python app.py"
) else (
    start "Backend Server" cmd /c "cd backend && python app.py"
)

echo [2/2] Dang khoi dong Frontend (Vite)...
cd frontend
if not exist node_modules (
    echo [!] Chua co node_modules, dang cai dat...
    call npm install
)
start "Frontend Server" cmd /c "npm run dev"
cd ..

echo.
echo ========================================
echo DA KICH HOAT CA 2 SERVER!
echo.
echo - Backend: http://localhost:6719
echo - Frontend: Vui long xem link trong cua so terminal vua mo.
echo ========================================
echo (Ban co the dong cua so nay bay gio)
pause
