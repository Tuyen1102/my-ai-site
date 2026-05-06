@echo off
chcp 65001 >nul
title TTCO - START STOCKPILE APP STABLE

setlocal

set "PROJECT_DIR=D:\TTCO_Tinh_Khoi_Luong_Than"
set "BACKEND_DIR=D:\TTCO_Tinh_Khoi_Luong_Than\backend"
set "APP_URL=http://127.0.0.1:8000"
set "BACKEND_URL=http://127.0.0.1:8000/api/health"

echo ======================================================
echo  TTCO - APP TINH KHOI LUONG THAN TON KHO
echo  BAN CHAY ON DINH - KHONG CAN npm run dev
echo ======================================================
echo.
echo Thu muc du an:
echo %PROJECT_DIR%
echo.

echo [0/6] Kiem tra thu muc va file can thiet...

if not exist "%PROJECT_DIR%" (
    echo [LOI] Khong tim thay thu muc du an:
    echo %PROJECT_DIR%
    echo.
    pause
    exit /b 1
)

if not exist "%BACKEND_DIR%" (
    echo [LOI] Khong tim thay thu muc backend:
    echo %BACKEND_DIR%
    echo.
    pause
    exit /b 1
)

if not exist "%BACKEND_DIR%\server.py" (
    echo [LOI] Khong tim thay file backend:
    echo %BACKEND_DIR%\server.py
    echo.
    pause
    exit /b 1
)

if not exist "%PROJECT_DIR%\package.json" (
    echo [LOI] Khong tim thay file package.json:
    echo %PROJECT_DIR%\package.json
    echo.
    pause
    exit /b 1
)

echo [OK] Da tim thay cac file can thiet.
echo.

echo [1/6] Kiem tra Python...
where python >nul 2>&1
if errorlevel 1 (
    echo [LOI] May chua nhan lenh python.
    echo.
    pause
    exit /b 1
)
python --version
echo [OK] Python san sang.
echo.

echo [2/6] Kiem tra Node.js...
where node >nul 2>&1
if errorlevel 1 (
    echo [LOI] May chua nhan lenh node.
    echo.
    pause
    exit /b 1
)
node -v
echo [OK] Node.js san sang.
echo.

echo [3/6] Kiem tra NPM...
where npm >nul 2>&1
if errorlevel 1 (
    echo [LOI] May chua nhan lenh npm.
    echo.
    pause
    exit /b 1
)
call npm -v
echo [OK] NPM san sang.
echo.

echo [4/6] Kiem tra node_modules...
if not exist "%PROJECT_DIR%\node_modules" (
    echo Chua co node_modules. Dang chay npm install...
    echo Viec nay co the mat vai phut trong lan dau.
    echo.
    cd /d "%PROJECT_DIR%"
    call npm install

    if errorlevel 1 (
        echo.
        echo [LOI] npm install bi loi.
        echo Hay chup man hinh loi gui lai.
        echo.
        pause
        exit /b 1
    )
)
echo [OK] node_modules san sang.
echo.

echo [5/6] Build React app sang thu muc dist...
cd /d "%PROJECT_DIR%"
call npm run build

if errorlevel 1 (
    echo.
    echo [LOI] npm run build bi loi.
    echo Hay chup man hinh loi gui lai.
    echo.
    pause
    exit /b 1
)

if not exist "%PROJECT_DIR%\dist\index.html" (
    echo.
    echo [LOI] Build xong nhung khong thay file:
    echo %PROJECT_DIR%\dist\index.html
    echo.
    pause
    exit /b 1
)

echo [OK] Build thanh cong.
echo.

echo [6/6] Khoi dong backend Python va mo web app...
echo.

start "TTCO Backend - FastAPI Stable" cmd /k "cd /d D:\TTCO_Tinh_Khoi_Luong_Than\backend && python server.py"

echo Dang doi backend khoi dong 6 giay...
timeout /t 6 /nobreak >nul

echo Dang mo trinh duyet:
echo %APP_URL%
start "" "%APP_URL%"

echo.
echo ======================================================
echo  DA KHOI DONG APP BAN ON DINH
echo ======================================================
echo.
echo Tu bay gio chi can dung dia chi:
echo %APP_URL%
echo.
echo Khong can chay npm run dev nua.
echo.
echo Can de nguyen cua so:
echo - TTCO Backend - FastAPI Stable
echo.
echo Link kiem tra backend:
echo %BACKEND_URL%
echo.
echo Khi dung xong, co the dong cua so backend.
echo.
pause