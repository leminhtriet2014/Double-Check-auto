@echo off
title Khoi dong Chrome Debug (Port 9222)
echo ======================================================
echo    KHOI DONG CHROME DEBUGGING MODE (PORT 9222)
echo ======================================================
echo.

set CHROME_PATH="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
if not exist %CHROME_PATH% (
    set CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
)

set PROFILE_DIR="%~dp0puppeteer_profile"

echo Dang kiem tra va don dep tien trinh Chrome cu...
taskkill /F /IM chrome.exe 2>nul
timeout /t 1 /nobreak >nul

echo Dang mo Google Chrome tren port 9222...
start "" %CHROME_PATH% --remote-debugging-port=9222 --user-data-dir=%PROFILE_DIR% --remote-allow-origins=* "https://script.google.com/a/macros/ap.averydennison.com/s/AKfycbxLH9vhzIGH6esLl33mvsHfXt9M5T9CoeP3wX9hECjdKgCjrVXmpvp_tVVj4xp7f7Zxjg/exec" "https://appdvn15.ap.averydennison.net/new-apps/public_html/adlh/lines/pcaccess/ItemMaster.php"

echo.
echo ======================================================
echo  Chrome da duoc khoi dong thanh cong!
echo  Ban co the quay lai Dashboard Web (port 3000) de bat dau doi soat.
echo ======================================================
timeout /t 3
