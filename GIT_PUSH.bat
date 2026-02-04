@echo off
set /p commit_msg="Nhap message commit (bam Enter de dung 'auto-sync'): "
if "%commit_msg%"=="" set commit_msg=auto-sync

echo.
echo [+] Dang add file...
git add .

echo [+] Dang commit: "%commit_msg%"
git commit -m "%commit_msg%"

echo [+] Dang push len GitHub...
git push origin main

echo.
echo [OK] Da xong!
pause
