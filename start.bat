@echo off
cd /d "%~dp0"
title SuperMart POS - Retail Billing Software
echo ===================================================================
echo  Starting SuperMart Retail Billing & POS System (College Project)
echo ===================================================================
echo.
echo Starting Backend (Spring Boot on port 8080)...
echo Starting Frontend (Vite React on port 5173)...
echo.
echo When ready, open your browser at: http://localhost:5173
echo Press Ctrl+C in this window to stop both servers when done.
echo.
npm run dev
