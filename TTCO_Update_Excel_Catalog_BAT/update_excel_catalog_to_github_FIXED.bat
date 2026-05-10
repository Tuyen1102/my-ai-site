@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion

title TTCO - Update Excel Catalog V5 VERIFY VALUE

REM ============================================================
REM TTCO UPDATE EXCEL CATALOG - V5 VERIFY
REM Muc dich:
REM - Chon file Excel moi.
REM - Kiem tra gia tri Kho 1 / Chieu_rong_m trong file duoc chon.
REM - Copy de vao main/public/data.
REM - Kiem tra lai file trong repo main.
REM - Commit/push main neu co thay doi.
REM - Copy truc tiep sang nhanh gh-pages/data.
REM - Commit/push gh-pages neu co thay doi.
REM ============================================================

set "REPO_DIR=D:\TTCO_TonKho_App_Repo"
set "MAIN_TARGET_REL=public\data\DS_kho_than_va_ty_khoi.xlsx"
set "MAIN_TARGET_FILE=%REPO_DIR%\%MAIN_TARGET_REL%"
set "PAGES_WORKTREE=%REPO_DIR%_gh_pages_worktree"
set "PAGES_TARGET_REL=data\DS_kho_than_va_ty_khoi.xlsx"
set "PAGES_TARGET_FILE=%PAGES_WORKTREE%\%PAGES_TARGET_REL%"
set "COMMIT_MSG=Update Excel catalog for warehouse dimensions and density"

echo.
echo ============================================================
echo   TTCO - UPDATE EXCEL CATALOG V5 VERIFY
echo ============================================================
echo.
echo Repo main: %REPO_DIR%
echo File main: %MAIN_TARGET_FILE%
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
    echo [LOI] Khong tim thay Git.
    pause
    exit /b 1
)

where python >nul 2>nul
if errorlevel 1 (
    echo [LOI] Khong tim thay Python.
    pause
    exit /b 1
)

echo Dang cai/kiem tra openpyxl...
python -m pip install openpyxl >nul 2>nul

echo.
echo Dang mo hop thoai chon file Excel...
for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "Add-Type -AssemblyName System.Windows.Forms; $d = New-Object System.Windows.Forms.OpenFileDialog; $d.Title = 'Chon file Excel DS_kho_than_va_ty_khoi.xlsx moi'; $d.Filter = 'Excel files (*.xlsx)|*.xlsx|All files (*.*)|*.*'; $d.Multiselect = $false; if ($d.ShowDialog() -eq 'OK') { [Console]::OutputEncoding = [Text.UTF8Encoding]::UTF8; Write-Output $d.FileName }"`) do set "SOURCE_FILE=%%I"

if not defined SOURCE_FILE (
    echo.
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

echo [KIEM TRA] Gia tri trong file anh vua chon:
python -c "from openpyxl import load_workbook; import sys; p=sys.argv[1]; wb=load_workbook(p,data_only=True); ws=wb['dm_kho']; headers=[c.value for c in ws[1]]; i_ten=headers.index('ten_kho')+1; i_rong=headers.index('Chieu_rong_m')+1; found=False; [print('  ', r[i_ten-1].value, '=> Chieu_rong_m =', r[i_rong-1].value) or setattr(sys, '_found', True) for r in ws.iter_rows(min_row=2) if str(r[i_ten-1].value).strip().lower()=='kho 1'];" "%SOURCE_FILE%"
if errorlevel 1 (
    echo [LOI] Khong doc duoc file Excel. Kiem tra sheet dm_kho va cot Chieu_rong_m.
    pause
    exit /b 1
)

echo.
choice /C YN /M "Neu gia tri vua hien la DUNG, bam Y de tiep tuc. Bam N de huy"
if errorlevel 2 (
    echo [HUY] Dung theo yeu cau.
    pause
    exit /b 0
)

if not exist "%REPO_DIR%\public\data" mkdir "%REPO_DIR%\public\data"

for %%A in ("%SOURCE_FILE%") do set "SOURCE_FULL=%%~fA"
for %%A in ("%MAIN_TARGET_FILE%") do set "MAIN_FULL=%%~fA"

if /I "!SOURCE_FULL!"=="!MAIN_FULL!" (
    echo.
    echo [MAIN] File da chon chinh la file trong main repo. Khong copy.
) else (
    copy /Y "%SOURCE_FILE%" "%MAIN_TARGET_FILE%" >nul
    if errorlevel 1 (
        echo [LOI] Khong copy duoc file vao main. Hay dong Excel neu dang mo.
        pause
        exit /b 1
    )
    echo.
    echo [MAIN] Da copy file moi vao:
    echo %MAIN_TARGET_FILE%
)

echo.
echo [KIEM TRA] Gia tri trong file main sau khi copy:
python -c "from openpyxl import load_workbook; import sys; p=sys.argv[1]; wb=load_workbook(p,data_only=True); ws=wb['dm_kho']; headers=[c.value for c in ws[1]]; i_ten=headers.index('ten_kho')+1; i_rong=headers.index('Chieu_rong_m')+1; [print('  ', r[i_ten-1].value, '=> Chieu_rong_m =', r[i_rong-1].value) for r in ws.iter_rows(min_row=2) if str(r[i_ten-1].value).strip().lower()=='kho 1'];" "%MAIN_TARGET_FILE%"
if errorlevel 1 (
    echo [LOI] Khong doc duoc file main sau khi copy.
    pause
    exit /b 1
)

echo.
echo [MAIN] Kiem tra thay doi Git...
git status --short "%MAIN_TARGET_REL%"

set "MAIN_CHANGED=0"
for /f "delims=" %%S in ('git status --short "%MAIN_TARGET_REL%"') do set "MAIN_CHANGED=1"

if "%MAIN_CHANGED%"=="1" (
    echo [MAIN] Dang commit va push...
    git add "%MAIN_TARGET_REL%"
    git commit -m "%COMMIT_MSG%"
    if errorlevel 1 (
        echo [LOI] Git commit main that bai.
        pause
        exit /b 1
    )
    git push
    if errorlevel 1 (
        echo [LOI] Git push main that bai.
        pause
        exit /b 1
    )
) else (
    echo [MAIN] Khong co thay doi moi can commit.
)

echo.
echo [GH-PAGES] Dang cap nhat truc tiep nhanh gh-pages...
git fetch origin gh-pages
if errorlevel 1 (
    echo [LOI] Khong fetch duoc nhanh gh-pages.
    pause
    exit /b 1
)

if exist "%PAGES_WORKTREE%" (
    git worktree remove "%PAGES_WORKTREE%" --force >nul 2>nul
    if exist "%PAGES_WORKTREE%" rmdir /s /q "%PAGES_WORKTREE%"
)

git worktree add "%PAGES_WORKTREE%" gh-pages
if errorlevel 1 (
    git worktree add -b gh-pages "%PAGES_WORKTREE%" origin/gh-pages
)
if errorlevel 1 (
    echo [LOI] Khong tao duoc worktree gh-pages.
    pause
    exit /b 1
)

if not exist "%PAGES_WORKTREE%\data" mkdir "%PAGES_WORKTREE%\data"
copy /Y "%MAIN_TARGET_FILE%" "%PAGES_TARGET_FILE%" >nul
if errorlevel 1 (
    echo [LOI] Khong copy duoc file vao gh-pages worktree.
    pause
    exit /b 1
)

echo.
echo [KIEM TRA] Gia tri trong file gh-pages sau khi copy:
python -c "from openpyxl import load_workbook; import sys; p=sys.argv[1]; wb=load_workbook(p,data_only=True); ws=wb['dm_kho']; headers=[c.value for c in ws[1]]; i_ten=headers.index('ten_kho')+1; i_rong=headers.index('Chieu_rong_m')+1; [print('  ', r[i_ten-1].value, '=> Chieu_rong_m =', r[i_rong-1].value) for r in ws.iter_rows(min_row=2) if str(r[i_ten-1].value).strip().lower()=='kho 1'];" "%PAGES_TARGET_FILE%"

cd /d "%PAGES_WORKTREE%"

set "PAGES_CHANGED=0"
for /f "delims=" %%S in ('git status --short "%PAGES_TARGET_REL%"') do set "PAGES_CHANGED=1"

if "%PAGES_CHANGED%"=="1" (
    echo [GH-PAGES] Dang commit va push...
    git add "%PAGES_TARGET_REL%"
    git commit -m "%COMMIT_MSG%"
    if errorlevel 1 (
        echo [LOI] Git commit gh-pages that bai.
        pause
        exit /b 1
    )
    git push origin gh-pages
    if errorlevel 1 (
        echo [LOI] Git push gh-pages that bai.
        pause
        exit /b 1
    )
) else (
    echo [GH-PAGES] Khong co thay doi moi can commit.
)

cd /d "%REPO_DIR%"
git worktree remove "%PAGES_WORKTREE%" --force >nul 2>nul
if exist "%PAGES_WORKTREE%" rmdir /s /q "%PAGES_WORKTREE%"

echo.
echo ============================================================
echo   HOAN THANH
echo ============================================================
echo.
echo Da xu ly xong main va gh-pages.
echo Cho 1-3 phut roi tai lai:
echo https://tuyen1102.github.io/my-ai-site/data/DS_kho_than_va_ty_khoi.xlsx?v=%RANDOM%
echo.
echo Sau do mo app:
echo https://tuyen1102.github.io/my-ai-site/?v=excel%RANDOM%
echo.
pause
exit /b 0
