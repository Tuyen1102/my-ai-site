@echo off
chcp 65001 >nul
title TTCO Check Co Che Tong Hop Than

cd /d "%~dp0"

echo ==================================================
echo   TTCO CHECK CO CHE TONG HOP CHUNG LOAI THAN
echo ==================================================
echo.

where python >nul 2>nul
if errorlevel 1 (
    echo [LOI] Khong tim thay Python.
    pause
    exit /b 1
)

echo Dang cai thu vien can thiet...
python -m pip install --upgrade pip
python -m pip install pyodbc python-dotenv openpyxl

echo.
echo Dang kiem tra database...
python check_co_che_tong_hop_than.py

echo.
echo Ket thuc. File ket qua nam trong thu muc:
echo mapping_output
echo.
pause
