@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion

title TTCO - Cai tu dong dong bo ton kho TTCO len GitHub khi bat may

REM ============================================================
REM FILE 2: INSTALL AUTO SYNC TTCO STOCK TO GITHUB ON WINDOWS LOGON
REM Chuc nang:
REM - Tao Task Scheduler de moi khi dang nhap Windows se chay:
REM   D:\TTCO_TonKho_App_Repo\run_sync_now.bat
REM - run_sync_now.bat se lay ton kho TTCO tu database va push JSON len GitHub.
REM ============================================================

set "REPO_DIR=D:\TTCO_TonKho_App_Repo"
set "RUN_BAT=%REPO_DIR%\run_sync_now.bat"
set "TASK_NAME=TTCO_TonKho_GitHub_Sync_OnLogon"

echo.
echo ============================================================
echo   TTCO - CAI TU DONG DONG BO TON KHO LEN GITHUB KHI BAT MAY
echo ============================================================
echo.
echo Repo: %REPO_DIR%
echo File chay sync: %RUN_BAT%
echo Task Scheduler: %TASK_NAME%
echo.

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Dang yeu cau quyen Administrator...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

if not exist "%REPO_DIR%" (
    echo [LOI] Khong tim thay thu muc repo:
    echo %REPO_DIR%
    pause
    exit /b 1
)

if not exist "%RUN_BAT%" (
    echo [LOI] Khong tim thay file:
    echo %RUN_BAT%
    pause
    exit /b 1
)

if not exist "%REPO_DIR%\sync_ton_kho_to_github.py" (
    echo [LOI] Khong tim thay file:
    echo %REPO_DIR%\sync_ton_kho_to_github.py
    pause
    exit /b 1
)

if not exist "%REPO_DIR%\.env" (
    echo [CANH BAO] Chua thay file .env trong repo.
    echo Neu script can DB config, hay tao/cap nhat file:
    echo %REPO_DIR%\.env
    choice /C YN /M "Van tiep tuc cai task?"
    if errorlevel 2 (
        echo [HUY] Dung cai task.
        pause
        exit /b 0
    )
)

echo Dang tao/cap nhat Task Scheduler...
schtasks /Create /TN "%TASK_NAME%" /TR "\"%RUN_BAT%\"" /SC ONLOGON /RL HIGHEST /F
if errorlevel 1 (
    echo [LOI] Tao Task Scheduler that bai.
    pause
    exit /b 1
)

echo.
echo Da tao task thanh cong.
schtasks /Query /TN "%TASK_NAME%" /FO LIST

echo.
choice /C YN /M "Co muon chay thu dong bo ngay bay gio khong?"
if errorlevel 2 goto END_OK

call "%RUN_BAT%"
if errorlevel 1 (
    echo [CANH BAO] Chay thu sync co loi. Task da cai, nhung can kiem tra thong bao o tren.
    pause
    exit /b 1
)

:END_OK
echo.
echo ============================================================
echo   HOAN THANH CAI TU DONG DONG BO
echo ============================================================
echo.
echo Tu lan dang nhap Windows tiep theo, may se tu chay:
echo %RUN_BAT%
echo.
pause
exit /b 0
