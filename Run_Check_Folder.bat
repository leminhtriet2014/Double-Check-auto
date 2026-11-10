@echo off
title Avery Dennison QA Double Check CLI
echo ======================================================
echo    AVERY DENNISON QA DOUBLE CHECK CLI RUNNER
echo ======================================================
echo.

set FOLDER=%1
if "%FOLDER%"=="" (
    set /p FOLDER="Nhap ten thu muc can doi soat (vi du: 07-Nov, 06-Nov): "
)

if "%FOLDER%"=="" (
    echo Khong co thu muc duoc nhap. Ket thuc chuong trinh.
    pause
    exit /b 1
)

echo.
echo Dang tien hanh doi soat cho thu muc: %FOLDER% ...
echo.

cd /d "%~dp0\double_check_tool"
node cli.js --folder "%FOLDER%"

echo.
pause

