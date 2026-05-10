@echo off
chcp 65001 >nul
setlocal

echo ========================================
echo  FIX TTCO COAL FILTER - Kho 26/Kho 28
echo ========================================
echo.

if not exist "src\App.jsx" (
  echo [LOI] Khong tim thay src\App.jsx.
  echo Hay copy 2 file fix vao thu muc goc repo my-ai-site roi chay lai.
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo [LOI] Chua cai Node.js hoac chua nhan lenh node.
  echo Hay cai Node.js truoc, sau do mo lai file nay.
  pause
  exit /b 1
)

node fix_ttco_coal_filter.js
if errorlevel 1 (
  echo.
  echo [LOI] Patch that bai. Xem thong bao phia tren.
  pause
  exit /b 1
)

echo.
echo Dang kiem tra build...
call npm run build
if errorlevel 1 (
  echo.
  echo [CANH BAO] Da sua file nhung build chua thanh cong.
  echo App.jsx da co file backup .bak trong src.
  pause
  exit /b 1
)

echo.
echo [OK] Da sua xong va build thanh cong.
echo Neu dung GitHub Pages, hay chay lenh deploy/push nhu quy trinh cu.
pause
