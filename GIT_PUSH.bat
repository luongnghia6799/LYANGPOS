@echo off
set /p msg="Nhap commit message (mac dinh: 'Update code support Turso'): "
if "%msg%"=="" set msg="Update code support Turso"

echo.
echo [1/3] Adding changes...
git add .

echo.
echo [2/3] Committing with message: %msg%
git commit -m "%msg%"

echo.
echo [3/3] Pushing to GitHub...
git push

echo.
echo Done! App cua anh dang duoc deploy tren Render...
pause
