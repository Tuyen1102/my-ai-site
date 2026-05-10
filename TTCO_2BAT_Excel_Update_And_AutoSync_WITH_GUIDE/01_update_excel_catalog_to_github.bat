@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion

title TTCO - Cap nhat file Excel danh muc len GitHub

REM ============================================================
REM FILE 1: UPDATE EXCEL CATALOG TO GITHUB
REM Chuc nang:
REM - Chon file Excel danh muc moi.
REM - Copy/ghi de thanh:
REM   D:\TTCO_TonKho_App_Repo\public\data\DS_kho_than_va_ty_khoi.xlsx
REM - Xoa file Excel sai vi tri neu con nam o public\DS_kho_than_va_ty_khoi.xlsx.
REM - Git add / commit / push.
REM - npm run deploy de cap nhat GitHub Pages.
REM ============================================================

set "REPO_DIR=D:\TTCO_TonKho_App_Repo"
set "TARGET_REL=public\data\DS_kho_than_va_ty_khoi.xlsx"
set "TARGET_FILE=%REPO_DIR%\%TARGET_REL%"
set "COMMIT_MSG=Update Excel catalog for warehouse dimensions and density"

echo.
echo ============================================================
echo   TTCO - CAP NHAT FILE EXCEL DANH MUC LEN GITHUB
echo ============================================================
echo.
echo Repo: %REPO_DIR%
echo File dich: %TARGET_FILE%
echo.

if not exist "%REPO_DIR%" (
    echo [LOI] Khong tim thay thu muc repo:
    echo %REPO_DIR%
    pause
    exit /b 1
)

cd /d "%REPO_DIR%"

if not exist ".git" (
    echo [LOI] Thu muc nay khong phai Git repo:
    echo %REPO_DIR%
    pause
    exit /b 1
)

where git >nul 2>nul
if errorlevel 1 (
    echo [LOI] Khong tim thay Git. Vui long cai Git truoc.
    pause
    exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
    echo [LOI] Khong tim thay Node.js/npm. Vui long cai Node.js truoc.
    pause
    exit /b 1
)

where python >nul 2>nul
if errorlevel 1 (
    echo [CANH BAO] Khong tim thay Python. BAT van tiep tuc, nhung bo qua kiem tra noi dung Excel.
    set "HAS_PYTHON=0"
) else (
    set "HAS_PYTHON=1"
)

echo Dang mo hop thoai chon file Excel...
for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "Add-Type -AssemblyName System.Windows.Forms; $d = New-Object System.Windows.Forms.OpenFileDialog; $d.Title = 'Chon file Excel DS_kho_than_va_ty_khoi.xlsx moi'; $d.Filter = 'Excel files (*.xlsx)|*.xlsx|All files (*.*)|*.*'; $d.Multiselect = $false; if ($d.ShowDialog() -eq 'OK') { [Console]::OutputEncoding = [Text.UTF8Encoding]::UTF8; Write-Output $d.FileName }"`) do set "SOURCE_FILE=%%I"

if not defined SOURCE_FILE (
    echo [HUY] Anh chua chon file Excel. Khong thay doi gi.
    pause
    exit /b 0
)

if not exist "%SOURCE_FILE%" (
    echo [LOI] File da chon khong ton tai:
    echo %SOURCE_FILE%
    pause
    exit /b 1
)

echo.
echo File da chon:
echo %SOURCE_FILE%
echo.

if "%HAS_PYTHON%"=="1" (
    python -m pip install openpyxl >nul 2>nul
    echo [KIEM TRA NHANH] Kho 1 / Chieu_rong_m trong file da chon:
    python -c "from openpyxl import load_workbook; import sys; p=sys.argv[1]; wb=load_workbook(p,data_only=True); ws=wb['dm_kho']; h=[c.value for c in ws[1]]; ik=h.index('ten_kho')+1; ir=h.index('Chieu_rong_m')+1; [print('  ', r[ik-1].value, '=> Chieu_rong_m =', r[ir-1].value) for r in ws.iter_rows(min_row=2) if str(r[ik-1].value).strip().lower()=='kho 1']" "%SOURCE_FILE%"
    echo.
    choice /C YN /M "Neu file da chon dung, bam Y de tiep tuc. Bam N de huy"
    if errorlevel 2 (
        echo [HUY] Dung theo yeu cau.
        pause
        exit /b 0
    )
)

if not exist "%REPO_DIR%\public\data" mkdir "%REPO_DIR%\public\data"

if exist "%REPO_DIR%\public\DS_kho_than_va_ty_khoi.xlsx" (
    echo Dang xoa file Excel sai vi tri: public\DS_kho_than_va_ty_khoi.xlsx
    del /f /q "%REPO_DIR%\public\DS_kho_than_va_ty_khoi.xlsx"
)

for %%A in ("%SOURCE_FILE%") do set "SOURCE_FULL=%%~fA"
for %%A in ("%TARGET_FILE%") do set "TARGET_FULL=%%~fA"

if /I "!SOURCE_FULL!"=="!TARGET_FULL!" (
    echo File da chon chinh la file trong public\data. Bo qua copy.
) else (
    copy /Y "%SOURCE_FILE%" "%TARGET_FILE%" >nul
    if errorlevel 1 (
        echo [LOI] Khong copy duoc file Excel. Hay dong Excel neu file dang mo.
        pause
        exit /b 1
    )
    echo Da copy Excel vao:
    echo %TARGET_FILE%
)

echo.
echo Dang commit/push neu co thay doi...
git add "%TARGET_REL%"
git add -u "public\DS_kho_than_va_ty_khoi.xlsx" 2>nul

git diff --cached --quiet
if not errorlevel 1 (
    echo [THONG BAO] Khong co thay doi Excel de commit.
) else (
    git commit -m "%COMMIT_MSG%"
    if errorlevel 1 (
        echo [LOI] Git commit that bai.
        pause
        exit /b 1
    )

    git pull --rebase origin main
    if errorlevel 1 (
        echo [LOI] Git pull --rebase that bai. Neu co conflict, chup anh man hinh gui de xu ly.
        pause
        exit /b 1
    )

    git push
    if errorlevel 1 (
        echo [LOI] Git push that bai. Kiem tra mang/GitHub.
        pause
        exit /b 1
    )
)

echo.
echo Dang deploy len GitHub Pages...
npm run deploy
if errorlevel 1 (
    echo [LOI] npm run deploy that bai. Kiem tra package.json co script deploy chua.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo   HOAN THANH CAP NHAT EXCEL
echo ============================================================
echo.
echo Doi 1-3 phut roi kiem tra app:
echo https://tuyen1102.github.io/my-ai-site/
echo.
pause
exit /b 0
