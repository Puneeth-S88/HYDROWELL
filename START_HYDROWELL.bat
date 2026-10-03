@echo off
title HYDROWELL - Local Full-Stack Server & Cloud Bridge
color 0b

echo ==============================================================================
echo   HYDROWELL (Sri Anantashayana Borewells & Pumps) - Server Launcher
echo ==============================================================================
echo.
echo [1/3] Starting MySQL and Apache in XAMPP...

start "" /min "C:\xampp\xampp_start.exe"

timeout /t 3 /nobreak > nul

echo [2/3] Connecting Cloud Bridge to GitHub Pages and Mobile Devices...

start "" /min "C:\xampp\cloudflared.exe" tunnel --url http://127.0.0.1:80

timeout /t 2 /nobreak > nul

echo [3/3] Opening HYDROWELL in browser...
start http://localhost/

echo.
echo ==============================================================================
echo   HYDROWELL Full-Stack Platform is ACTIVE!
echo   - Local Dashboard:  http://localhost/
echo   - Public Website:   https://puneeth-s88.github.io/HYDROWELL/
echo   - WhatsApp 1:       +91 98807 01789
echo   - WhatsApp 2:       +91 93804 10134
echo ==============================================================================
echo.
echo Keep this window open while testing local MySQL sync.
echo Press any key to stop services when finished...
pause > nul

echo Stopping services...
start "" /min "C:\xampp\xampp_stop.exe"
taskkill /f /im cloudflared.exe > nul 2>&1
echo Done!
