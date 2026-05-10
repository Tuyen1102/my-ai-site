@echo off
chcp 65001 >nul
title Go task TTCO Ton Kho GitHub Sync

echo Dang xoa task TTCO_TonKho_GitHub_Sync_OnLogon...
schtasks /Delete /TN "TTCO_TonKho_GitHub_Sync_OnLogon" /F

echo.
echo Da xoa task neu task ton tai.
pause
