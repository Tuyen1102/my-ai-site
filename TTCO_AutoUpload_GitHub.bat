@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================================
REM  TTCO TON KHO - AUTO UPLOAD DATA TO GITHUB
REM  File BAT duy nhất gồm:
REM    1. Cài đặt tự động tải dữ liệu TTCO_APP và đẩy lên GitHub khi bật máy
REM    2. Tải dữ liệu TTCO_APP và đẩy lên GitHub ngay tại thời điểm hiện tại
REM
REM  Nguyên tắc hoạt động:
REM    - Lần đầu chạy: nhập thư mục repo app GitHub và nguồn dữ liệu TTCO_APP.
REM    - Nguồn dữ liệu có thể là:
REM        + Một file cố định, ví dụ: D:\TTCO_APP_EXPORT\TonKho.xlsx
REM        + Một thư mục, chương trình sẽ tự lấy file mới nhất .xlsx/.xls/.csv/.json
REM    - File nguồn sẽ được copy vào repo GitHub theo đường dẫn đích đã cấu hình.
REM    - Sau đó tự git add -> commit -> pull --rebase -> push.
REM    - Mục 1 tạo Windows Scheduled Task chạy khi người dùng đăng nhập Windows.
REM ============================================================

set "APP_NAME=TTCO_TonKho_AutoUpload"
set "TASK_NAME=TTCO_TonKho_AutoUpload_OnLogon"
set "BASE_DIR=%~dp0"
set "CONFIG_FILE=%BASE_DIR%TTCO_AutoUpload_Config.ini"
set "LOG_DIR=%BASE_DIR%logs"
set "LOG_FILE=%LOG_DIR%\TTCO_AutoUpload.log"

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%" >nul 2>&1

if /I "%~1"=="--run" (
    call :LOAD_CONFIG
    if errorlevel 1 exit /b 1
    call :RUN_NOW
    exit /b %errorlevel%
)

:MENU
cls
echo ============================================================
echo           TTCO TON KHO - AUTO UPLOAD GITHUB
echo ============================================================
echo.
echo  1. Cai dat tu dong tai du lieu TTCO_APP va tai len GitHub
echo     cua app khi vua bat may / dang nhap Windows
echo.
echo  2. Tai du lieu TTCO_APP va tai len GitHub tai thoi diem hien tai
echo.
echo  0. Thoat
echo.
echo ============================================================
set /p "CHOICE=Nhap lua chon: "

if "%CHOICE%"=="1" goto INSTALL_AUTO
if "%CHOICE%"=="2" goto MANUAL_RUN
if "%CHOICE%"=="0" exit /b 0

echo.
echo Lua chon khong hop le.
pause
goto MENU


:INSTALL_AUTO
cls
echo ============================================================
echo     CAI DAT TU DONG CAP NHAT DU LIEU LEN GITHUB KHI BAT MAY
echo ============================================================
echo.
echo Luu y:
echo - Neu app GitHub Pages dang dung file du lieu nao thi nhap dung
echo   duong dan dich tuong ung trong repo.
echo - Vi du duong dan dich: public\data\ttco_tonkho.xlsx
echo - Neu chua chac, co the nhap: public\data\ttco_tonkho.xlsx
echo.

call :CONFIG_WIZARD
if errorlevel 1 (
    echo.
    echo Cau hinh khong thanh cong.
    pause
    goto MENU
)

echo.
echo Dang tao lich chay tu dong khi dang nhap Windows...
schtasks /Create /TN "%TASK_NAME%" /TR "\"%~f0\" --run" /SC ONLOGON /DELAY 0001:00 /RL HIGHEST /F >nul 2>&1

if errorlevel 1 (
    echo.
    echo Khong tao duoc Scheduled Task voi quyen cao.
    echo Thu tao lai voi che do thong thuong...
    schtasks /Create /TN "%TASK_NAME%" /TR "\"%~f0\" --run" /SC ONLOGON /DELAY 0001:00 /F >nul 2>&1
)

if errorlevel 1 (
    echo.
    echo LOI: Khong tao duoc lich chay tu dong.
    echo Cach xu ly:
    echo - Bam chuot phai file BAT nay, chon Run as administrator.
    echo - Sau do chon lai muc 1.
    call :LOG "ERROR: Khong tao duoc Scheduled Task."
    pause
    goto MENU
)

call :LOG "Da tao Scheduled Task: %TASK_NAME%"
echo.
echo DA CAI DAT XONG.
echo Moi lan dang nhap Windows, may se tu dong cap nhat du lieu len GitHub sau khoang 1 phut.
echo.
set /p "RUNFIRST=Co chay thu ngay bay gio khong? Nhap Y de chay, phim khac de bo qua: "
if /I "%RUNFIRST%"=="Y" (
    call :RUN_NOW
    echo.
    pause
)
goto MENU


:MANUAL_RUN
cls
echo ============================================================
echo        CAP NHAT DU LIEU TTCO_APP LEN GITHUB NGAY BAY GIO
echo ============================================================
echo.
call :LOAD_CONFIG
if errorlevel 1 (
    echo Chua co cau hinh hoac cau hinh bi loi. Bat dau cau hinh lan dau...
    echo.
    call :CONFIG_WIZARD
    if errorlevel 1 (
        echo.
        echo Cau hinh khong thanh cong.
        pause
        goto MENU
    )
)
call :RUN_NOW
echo.
pause
goto MENU


:CONFIG_WIZARD
echo ===== BUOC 1: KHAI BAO THU MUC REPO GITHUB CUA APP =====
echo.
echo Vi du: D:\TTCO_TonKho_App_Repo
echo Neu file BAT dang dat ngay trong thu muc repo, co the nhap dau cham: .
echo.
set /p "REPO_DIR=Nhap duong dan thu muc repo GitHub cua app: "
if "%REPO_DIR%"=="" exit /b 1
if "%REPO_DIR%"=="." set "REPO_DIR=%BASE_DIR%"

for %%I in ("%REPO_DIR%") do set "REPO_DIR=%%~fI"

if not exist "%REPO_DIR%\" (
    echo.
    echo LOI: Khong tim thay thu muc repo: %REPO_DIR%
    exit /b 1
)

if not exist "%REPO_DIR%\.git\" (
    echo.
    echo CANH BAO: Thu muc nay chua thay folder .git:
    echo %REPO_DIR%
    echo.
    set /p "CONTINUE_NOT_GIT=Van tiep tuc? Nhap Y de tiep tuc: "
    if /I not "%CONTINUE_NOT_GIT%"=="Y" exit /b 1
)

echo.
echo ===== BUOC 2: CHON NGUON DU LIEU TTCO_APP =====
echo.
echo 1. Lay tu mot file co dinh
echo    Vi du: D:\TTCO_APP_EXPORT\TonKho.xlsx
echo.
echo 2. Lay file moi nhat trong mot thu muc
echo    Vi du: D:\TTCO_APP_EXPORT
echo    Chuong trinh se tu tim file moi nhat dang .xlsx/.xls/.csv/.json
echo.
set /p "SOURCE_MODE=Chon kieu nguon du lieu [1/2]: "
if not "%SOURCE_MODE%"=="1" if not "%SOURCE_MODE%"=="2" (
    echo LOI: Kieu nguon du lieu khong hop le.
    exit /b 1
)

if "%SOURCE_MODE%"=="1" (
    set /p "SOURCE_PATH=Nhap duong dan file du lieu TTCO_APP: "
    if "%SOURCE_PATH%"=="" exit /b 1
    if not exist "%SOURCE_PATH%" (
        echo.
        echo LOI: Khong tim thay file nguon: %SOURCE_PATH%
        exit /b 1
    )
) else (
    set /p "SOURCE_PATH=Nhap duong dan thu muc xuat du lieu TTCO_APP: "
    if "%SOURCE_PATH%"=="" exit /b 1
    if not exist "%SOURCE_PATH%\" (
        echo.
        echo LOI: Khong tim thay thu muc nguon: %SOURCE_PATH%
        exit /b 1
    )
)

echo.
echo ===== BUOC 3: KHAI BAO NOI LUU FILE DU LIEU TRONG REPO =====
echo.
echo Vi du thuong dung:
echo - public\data\ttco_tonkho.xlsx
echo - public\ttco_tonkho.xlsx
echo - data\ttco_tonkho.json
echo.
set /p "DEST_REL=Nhap duong dan dich trong repo [mac dinh: public\data\ttco_tonkho.xlsx]: "
if "%DEST_REL%"=="" set "DEST_REL=public\data\ttco_tonkho.xlsx"

echo.
echo ===== BUOC 4: THIET LAP NHANH GIT =====
echo Neu GitHub da luu dang nhap san thi bo qua 2 dong duoi cung duoc.
echo.
set /p "GIT_BRANCH=Nhap ten nhanh GitHub can day len [mac dinh: main]: "
if "%GIT_BRANCH%"=="" set "GIT_BRANCH=main"

(
    echo REPO_DIR=%REPO_DIR%
    echo SOURCE_MODE=%SOURCE_MODE%
    echo SOURCE_PATH=%SOURCE_PATH%
    echo DEST_REL=%DEST_REL%
    echo GIT_BRANCH=%GIT_BRANCH%
) > "%CONFIG_FILE%"

call :LOG "Da luu cau hinh vao %CONFIG_FILE%"
echo.
echo Da luu cau hinh thanh cong:
echo - Repo: %REPO_DIR%
echo - Nguon: %SOURCE_PATH%
echo - Dich: %DEST_REL%
echo - Nhanh: %GIT_BRANCH%
echo.
exit /b 0


:LOAD_CONFIG
if not exist "%CONFIG_FILE%" (
    call :LOG "ERROR: Khong tim thay file cau hinh."
    exit /b 1
)

for /f "usebackq tokens=1,* delims==" %%A in ("%CONFIG_FILE%") do (
    if /I "%%A"=="REPO_DIR" set "REPO_DIR=%%B"
    if /I "%%A"=="SOURCE_MODE" set "SOURCE_MODE=%%B"
    if /I "%%A"=="SOURCE_PATH" set "SOURCE_PATH=%%B"
    if /I "%%A"=="DEST_REL" set "DEST_REL=%%B"
    if /I "%%A"=="GIT_BRANCH" set "GIT_BRANCH=%%B"
)

if "%REPO_DIR%"=="" exit /b 1
if "%SOURCE_MODE%"=="" exit /b 1
if "%SOURCE_PATH%"=="" exit /b 1
if "%DEST_REL%"=="" exit /b 1
if "%GIT_BRANCH%"=="" set "GIT_BRANCH=main"

exit /b 0


:RUN_NOW
call :LOG "===== BAT DAU CAP NHAT DU LIEU LEN GITHUB ====="

where git >nul 2>&1
if errorlevel 1 (
    echo LOI: May chua cai Git hoac Git chua co trong PATH.
    echo Hay cai Git for Windows, sau do mo lai file BAT.
    call :LOG "ERROR: Khong tim thay lenh git."
    exit /b 1
)

if not exist "%REPO_DIR%\" (
    echo LOI: Khong tim thay repo: %REPO_DIR%
    call :LOG "ERROR: Khong tim thay repo %REPO_DIR%"
    exit /b 1
)

call :SELECT_SOURCE_FILE
if errorlevel 1 (
    echo LOI: Khong xac dinh duoc file du lieu nguon TTCO_APP.
    call :LOG "ERROR: Khong xac dinh duoc file nguon."
    exit /b 1
)

set "DEST_FILE=%REPO_DIR%\%DEST_REL%"
for %%D in ("%DEST_FILE%") do set "DEST_DIR=%%~dpD"

if not exist "%DEST_DIR%" mkdir "%DEST_DIR%" >nul 2>&1

echo.
echo Nguon du lieu: "%SELECTED_SOURCE%"
echo File dich    : "%DEST_FILE%"
echo.

copy /Y "%SELECTED_SOURCE%" "%DEST_FILE%" >nul
if errorlevel 1 (
    echo LOI: Khong copy duoc file du lieu vao repo.
    call :LOG "ERROR: Copy that bai tu %SELECTED_SOURCE% den %DEST_FILE%"
    exit /b 1
)

call :LOG "Da copy file nguon vao repo: %DEST_FILE%"

pushd "%REPO_DIR%" >nul
if errorlevel 1 (
    echo LOI: Khong vao duoc thu muc repo.
    call :LOG "ERROR: pushd repo that bai."
    exit /b 1
)

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
    echo LOI: Thu muc nay khong phai Git repo hop le:
    echo %REPO_DIR%
    call :LOG "ERROR: Khong phai Git repo hop le."
    popd >nul
    exit /b 1
)

git checkout "%GIT_BRANCH%" >nul 2>&1
if errorlevel 1 (
    echo CANH BAO: Khong checkout duoc nhanh %GIT_BRANCH%. Tiep tuc voi nhanh hien tai.
    call :LOG "WARNING: Khong checkout duoc branch %GIT_BRANCH%."
)

git add "%DEST_REL%" >nul 2>&1
if errorlevel 1 (
    echo LOI: Git add that bai.
    call :LOG "ERROR: git add that bai."
    popd >nul
    exit /b 1
)

git diff --cached --quiet
if not errorlevel 1 (
    echo Khong co thay doi moi trong file du lieu. Khong can commit/push.
    call :LOG "Khong co thay doi moi."
    popd >nul
    exit /b 0
)

for /f "usebackq delims=" %%T in (`powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd HH:mm:ss'"`) do set "NOW_TEXT=%%T"

git commit -m "Update TTCO ton kho data %NOW_TEXT%" >nul 2>&1
if errorlevel 1 (
    echo LOI: Git commit that bai.
    echo Neu day la lan dau dung Git tren may nay, hay cau hinh:
    echo   git config --global user.name "Ten cua ban"
    echo   git config --global user.email "email@example.com"
    call :LOG "ERROR: git commit that bai."
    popd >nul
    exit /b 1
)

call :LOG "Da commit du lieu moi."

echo Dang dong bo voi GitHub...
git pull --rebase origin "%GIT_BRANCH%" >nul 2>&1
if errorlevel 1 (
    echo CANH BAO: Git pull --rebase bi loi. Van thu push tiep.
    call :LOG "WARNING: git pull --rebase loi."
)

set "PUSH_OK=0"
for /L %%R in (1,1,3) do (
    echo Dang push len GitHub, lan thu %%R/3...
    git push origin "%GIT_BRANCH%" >nul 2>&1
    if not errorlevel 1 (
        set "PUSH_OK=1"
        goto PUSH_DONE
    )
    timeout /t 15 /nobreak >nul
)

:PUSH_DONE
popd >nul

if "%PUSH_OK%"=="1" (
    echo.
    echo DA CAP NHAT DU LIEU LEN GITHUB THANH CONG.
    call :LOG "Push len GitHub thanh cong."
    exit /b 0
) else (
    echo.
    echo LOI: Khong push duoc len GitHub.
    echo Cac nguyen nhan thuong gap:
    echo - May chua co Internet.
    echo - GitHub chua dang nhap / token het han.
    echo - Repo chua co remote origin.
    echo - Branch cau hinh khong dung.
    echo.
    echo Xem log tai:
    echo %LOG_FILE%
    call :LOG "ERROR: Push len GitHub that bai."
    exit /b 1
)


:SELECT_SOURCE_FILE
set "SELECTED_SOURCE="

if "%SOURCE_MODE%"=="1" (
    if exist "%SOURCE_PATH%" (
        set "SELECTED_SOURCE=%SOURCE_PATH%"
        exit /b 0
    ) else (
        exit /b 1
    )
)

if "%SOURCE_MODE%"=="2" (
    if not exist "%SOURCE_PATH%\" exit /b 1

    set "PS_SOURCE=%SOURCE_PATH%"
    for /f "usebackq delims=" %%F in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "$p=$env:PS_SOURCE; $f=Get-ChildItem -LiteralPath $p -File | Where-Object { $_.Extension -in '.xlsx','.xls','.csv','.json' } | Sort-Object LastWriteTime -Descending | Select-Object -First 1; if($f){$f.FullName}"`) do (
        set "SELECTED_SOURCE=%%F"
    )

    if "%SELECTED_SOURCE%"=="" exit /b 1
    if not exist "%SELECTED_SOURCE%" exit /b 1
    exit /b 0
)

exit /b 1


:LOG
set "MSG=%~1"
>> "%LOG_FILE%" echo [%date% %time%] %MSG%
exit /b 0
