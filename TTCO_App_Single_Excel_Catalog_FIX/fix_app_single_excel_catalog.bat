@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion

title TTCO - Chuan hoa app chi doc Excel trong public/data

REM ============================================================
REM TTCO - FIX APP EXCEL PATH
REM Muc dich:
REM - Dam bao app chi doc duy nhat:
REM   public/data/DS_kho_than_va_ty_khoi.xlsx
REM - Xoa file Excel cu neu dang nam sai o:
REM   public/DS_kho_than_va_ty_khoi.xlsx
REM - Search code de kiem tra khong con duong dan cu.
REM ============================================================

set "REPO_DIR=D:\TTCO_TonKho_App_Repo"
set "RIGHT_FILE=public\data\DS_kho_than_va_ty_khoi.xlsx"
set "WRONG_FILE=public\DS_kho_than_va_ty_khoi.xlsx"

echo.
echo ============================================================
echo   TTCO - CHUAN HOA DUONG DAN EXCEL DANH MUC
echo ============================================================
echo.

cd /d "%REPO_DIR%"
if errorlevel 1 (
    echo [LOI] Khong vao duoc repo: %REPO_DIR%
    pause
    exit /b 1
)

echo [1] Kiem tra file dung:
if exist "%RIGHT_FILE%" (
    echo OK: %RIGHT_FILE%
) else (
    echo [LOI] Chua co file dung:
    echo %RIGHT_FILE%
    echo Hay copy DS_kho_than_va_ty_khoi.xlsx vao public\data truoc.
    pause
    exit /b 1
)

echo.
echo [2] Xoa file Excel sai vi tri neu co:
if exist "%WRONG_FILE%" (
    del /f /q "%WRONG_FILE%"
    echo Da xoa: %WRONG_FILE%
) else (
    echo Khong co file sai vi tri: %WRONG_FILE%
)

echo.
echo [3] Tim duong dan Excel trong code:
findstr /S /N /I "DS_kho_than_va_ty_khoi.xlsx public/DS_kho_than_va_ty_khoi.xlsx /DS_kho_than_va_ty_khoi.xlsx" src\*.jsx src\*.js vite.config.* package.json

echo.
echo Neu trong App.jsx chi thay:
echo   data/DS_kho_than_va_ty_khoi.xlsx
echo   public/data/DS_kho_than_va_ty_khoi.xlsx
echo la dung.
echo.

echo [4] Git add/commit/push/deploy:
git add src/App.jsx public/data/DS_kho_than_va_ty_khoi.xlsx
git add -u public/DS_kho_than_va_ty_khoi.xlsx 2>nul

git commit -m "Use single Excel catalog file from public data"
if errorlevel 1 (
    echo.
    echo [THONG BAO] Co the khong co thay doi de commit. Tiep tuc deploy.
)

git push
npm run deploy

echo.
echo HOAN THANH.
echo Kiem tra file Excel online:
echo https://tuyen1102.github.io/my-ai-site/data/DS_kho_than_va_ty_khoi.xlsx?v=%RANDOM%
echo.
echo Kiem tra app:
echo https://tuyen1102.github.io/my-ai-site/?v=single_excel_%RANDOM%
echo.
pause
