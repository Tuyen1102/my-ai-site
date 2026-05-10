@echo off
chcp 65001 >nul
title TTCO Ton Kho GitHub Sync

cd /d "%~dp0"

echo ==================================================
echo   TTCO TON KHO GITHUB SYNC - RUN NOW
echo ==================================================
echo.

python sync_ton_kho_to_github.py

echo.
echo Ket thuc. Neu co loi, chup man hinh gui ChatGPT.
pause
