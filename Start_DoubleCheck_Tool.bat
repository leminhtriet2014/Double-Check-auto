@echo off
title Avery Dennison QA Double Check Tool
echo ======================================================
echo    AVERY DENNISON QA DOUBLE CHECK AUTOMATED TOOL
echo ======================================================
echo.

cd /d "%~dp0\double_check_tool"

echo Starting Local Web Server on http://localhost:3000 ...
start "" "http://localhost:3000"
node server.js

pause

