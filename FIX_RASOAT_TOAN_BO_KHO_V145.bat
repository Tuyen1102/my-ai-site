@echo off
chcp 65001 >nul
setlocal

echo ======================================================
echo TTCO - RÀ SOÁT TOÀN BỘ KHO + CHỦNG LOẠI + TỒN KHO V145
echo ======================================================
echo.

if not exist "package.json" (
  echo [LOI] Hay copy file BAT va file .cjs vao thu muc goc repo, noi co package.json
  pause
  exit /b 1
)

if not exist "src\App.jsx" (
  echo [LOI] Khong thay src\App.jsx
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo [LOI] Chua cai Node.js hoac Node.js chua co trong PATH
  pause
  exit /b 1
)

where git >nul 2>nul
if errorlevel 1 (
  echo [LOI] Chua cai Git hoac Git chua co trong PATH
  pause
  exit /b 1
)

echo [1/4] Cap nhat repo moi nhat...
git pull origin main
if errorlevel 1 (
  echo [CANH BAO] git pull loi. Van tiep tuc sua tren ban hien tai.
)

echo.
echo [2/4] Sua App.jsx theo logic TenKho TTCO_JSON...
node fix_strict_ttco_json_and_push.cjs
if errorlevel 1 (
  echo.
  echo [LOI] Qua trinh sua/build/push bi loi. Xem thong bao ben tren.
  pause
  exit /b 1
)

echo.
echo [3/4] Hoan tat.
echo [4/4] Mo web va bam Ctrl + F5 de xoa cache.
echo.
pause
