@echo off
chcp 65001 >nul
title TTCO DB Mapping Check

cd /d "%~dp0"

echo ==================================================
echo   TTCO DB MAPPING CHECK - KHO / CHUNG LOAI THAN
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
echo Dang xuat file mapping tu database...
python export_db_mapping_kho_than.py

echo.
echo Ket thuc. File ket qua nam trong thu muc:
echo mapping_output
echo.
pause
