@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion

title TTCO - Fix loại than Kho 26/Kho 28 và push GitHub

echo ==========================================================
echo  TTCO - FIX LOAI THAN THEO TON KHO HIEN HANH + PUSH GITHUB
echo ==========================================================
echo.

set "REPO_DIR=%CD%"

if not exist "%REPO_DIR%\src\App.jsx" (
  if exist "D:\TTCO_TonKho_App_Repo\src\App.jsx" set "REPO_DIR=D:\TTCO_TonKho_App_Repo"
)

if not exist "%REPO_DIR%\src\App.jsx" (
  if exist "D:\my-ai-site\src\App.jsx" set "REPO_DIR=D:\my-ai-site"
)

if not exist "%REPO_DIR%\src\App.jsx" (
  echo [LOI] Khong tim thay src\App.jsx.
  echo Hay copy 2 file nay vao thu muc goc repo my-ai-site roi chay lai:
  echo   - FIX_VA_PUSH_GITHUB_TTCO.bat
  echo   - fix_ttco_coal_filter_and_push.cjs
  echo.
  set /p REPO_DIR=Nhap duong dan thu muc repo, vi du D:\TTCO_TonKho_App_Repo: 
)

if not exist "%REPO_DIR%\src\App.jsx" (
  echo [LOI] Duong dan repo khong dung: %REPO_DIR%
  pause
  exit /b 1
)

cd /d "%REPO_DIR%"
echo [OK] Repo: %CD%
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [LOI] Chua cai Node.js hoac may chua nhan lenh node.
  pause
  exit /b 1
)

where git >nul 2>nul
if errorlevel 1 (
  echo [LOI] Chua cai Git hoac may chua nhan lenh git.
  pause
  exit /b 1
)

if not exist ".git" (
  echo [LOI] Thu muc nay chua phai Git repo, khong the push len GitHub.
  pause
  exit /b 1
)

echo [1/5] Cap nhat code moi nhat tu GitHub...
git pull origin main
if errorlevel 1 (
  echo [CANH BAO] git pull that bai. Co the do mang hoac xung dot file.
  echo Neu anh van muon sua file local, hay xu ly Git truoc roi chay lai.
  pause
  exit /b 1
)

echo.
echo [2/5] Sua src\App.jsx...
node "%~dp0fix_ttco_coal_filter_and_push.cjs"
if errorlevel 1 (
  echo [LOI] Sua file that bai.
  pause
  exit /b 1
)

echo.
echo [3/5] Kiem tra build...
call npm run build
if errorlevel 1 (
  echo [LOI] Build that bai. Da tao file backup .bak trong src.
  pause
  exit /b 1
)

echo.
echo [4/5] Commit thay doi...
git status --short

git add src/App.jsx

git diff --cached --quiet
if not errorlevel 1 (
  echo [THONG BAO] Khong co thay doi moi de commit. Co the code da sua tu truoc.
) else (
  git commit -m "Fix TTCO coal type filter by current stock"
  if errorlevel 1 (
    echo [LOI] Commit that bai.
    pause
    exit /b 1
  )
)

echo.
echo [5/5] Push len GitHub...
git push origin main
if errorlevel 1 (
  echo [LOI] Push that bai. Thuong do chua dang nhap GitHub tren may hoac token het han.
  echo File local da sua xong, anh co the mo GitHub Desktop de Push.
  pause
  exit /b 1
)

echo.
echo ==========================================================
echo [OK] Da sua xong, build thanh cong va push len GitHub.
echo Vao trang GitHub Pages tren dien thoai, bam refresh sau vai phut.
echo ==========================================================
pause
