@echo off
setlocal enabledelayedexpansion

echo ======================================================
echo    BAT DAU QUA TRINH DONG GOI LYANGPOS (FULL)
echo ======================================================

:: 0. Don dep moi truong cu
echo 1. Dang xoa cac ban build cu...
if exist dist rd /s /q dist
if exist build rd /s /q build
if exist frontend\dist rd /s /q frontend\dist

:: 1. Build Frontend
echo 2. Dang build Frontend (React)...
cd frontend
call npm install
call npm run build
if %errorlevel% neq 0 (
    echo [LOI] Khong the build Frontend.
    pause
    exit /b %errorlevel%
)
cd ..

:: 2. Chuan bi Backend
echo 3. Dang kiem tra va cai dat thu vien Backend...
if exist .venv (
    call .venv\Scripts\activate
    python -m pip install -r backend/requirements.txt
) else (
    echo [CANH BAO] Khong tim thay .venv, su dung python he thong...
    python -m pip install -r backend/requirements.txt
)

:: 3. Dong goi tat ca bang PyInstaller
echo 4. Dang dong goi tat ca thanh file EXE duy nhat...
python -m PyInstaller --clean --noconfirm LyangPOS.spec

if %errorlevel% neq 0 (
    echo [LOI] Qua trinh dong goi PyInstaller bi loi.
    pause
    exit /b %errorlevel%
)

echo ======================================================
echo    HOAN THANH!
echo    Ket qua tai: dist/LyangPOS
echo ======================================================
pause
