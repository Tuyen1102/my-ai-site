@echo off
chcp 65001 >nul

:: ==================================================
::  TTCO TON KHO GITHUB SYNC - INSTALL AUTO STARTUP
::  File này sẽ tự yêu cầu quyền Administrator khi bấm đúp.
:: ==================================================

:: Kiểm tra quyền Administrator
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Dang yeu cau quyen Administrator...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

title Cai dat TTCO Ton Kho GitHub Sync

cd /d "%~dp0"

echo ==================================================
echo   CAI DAT TTCO TON KHO GITHUB SYNC
echo ==================================================
echo.

where python >nul 2>nul
if errorlevel 1 (
    echo [LOI] Khong tim thay Python.
    echo Hay cai Python va tick Add Python to PATH.
    echo.
    pause
    exit /b 1
)

where git >nul 2>nul
if errorlevel 1 (
    echo [LOI] Khong tim thay Git.
    echo Hay cai Git for Windows truoc.
    echo.
    pause
    exit /b 1
)

if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo Da tao file .env tu .env.example
        echo Hay mo file .env de kiem tra GIT_REPO_DIR neu can.
        echo.
    ) else (
        echo [LOI] Khong tim thay file .env.example.
        echo Hay kiem tra lai goi cai dat.
        echo.
        pause
        exit /b 1
    )
)

if not exist "requirements.txt" (
    echo [LOI] Khong tim thay requirements.txt.
    echo Hay kiem tra lai goi cai dat.
    echo.
    pause
    exit /b 1
)

if not exist "run_sync_now.bat" (
    echo [LOI] Khong tim thay run_sync_now.bat.
    echo Hay kiem tra lai goi cai dat.
    echo.
    pause
    exit /b 1
)

echo Dang cai thu vien Python...
python -m pip install --upgrade pip
if errorlevel 1 (
    echo [LOI] Nang cap pip that bai.
    echo.
    pause
    exit /b 1
)

python -m pip install -r requirements.txt
if errorlevel 1 (
    echo [LOI] Cai thu vien Python that bai.
    echo.
    pause
    exit /b 1
)

echo.
echo Tao task tu dong chay khi dang nhap Windows...
schtasks /Create /TN "TTCO_TonKho_GitHub_Sync_OnLogon" /TR "\"%~dp0run_sync_now.bat\"" /SC ONLOGON /RL HIGHEST /F
if errorlevel 1 (
    echo [LOI] Tao task that bai.
    echo Hay chup man hinh loi gui ChatGPT.
    echo.
    pause
    exit /b 1
)

echo.
echo ==================================================
echo   CAI DAT XONG
echo ==================================================
echo Task da duoc tao:
echo TTCO_TonKho_GitHub_Sync_OnLogon
echo.
echo Task se tu dong chay khi dang nhap Windows.
echo De test ngay, chay file run_sync_now.bat
echo.
pause
