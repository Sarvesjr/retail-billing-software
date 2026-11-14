@echo off
setlocal enabledelayedexpansion
title Retail Billing Software - POS Launcher
cd /d "%~dp0"

echo =========================================================
echo       RETAIL BILLING & INVENTORY MANAGEMENT SYSTEM       
echo =========================================================
echo.
echo [1/3] Checking MySQL Database Service...

sc query MySQL96 | find "RUNNING" >nul 2>&1
if %errorlevel% equ 0 (
    echo       MySQL96 database service is active.
) else (
    sc query MySQL80 | find "RUNNING" >nul 2>&1
    if %errorlevel% equ 0 (
        echo       MySQL80 database service is active.
    ) else (
        sc query MySQL | find "RUNNING" >nul 2>&1
        if %errorlevel% equ 0 (
            echo       MySQL database service is active.
        ) else (
            echo       Attempting to start MySQL service...
            net start MySQL96 >nul 2>&1 || net start MySQL80 >nul 2>&1 || net start MySQL >nul 2>&1
        )
    )
)

echo.
echo [2/3] Checking ports and cleaning up stale sessions...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 5000,5173 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>&1

echo.
echo [3/3] Activating Backend Server, Mobile Scanner and Desktop POS...
echo.
echo       The desktop application window will open automatically.
echo       To close the app, simply click the [X] button on the window.
echo.

npm run dev
