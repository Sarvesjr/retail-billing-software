@echo off
setlocal
where mvn >nul 2>&1
if %ERRORLEVEL% equ 0 (
    mvn %*
) else if exist "C:\Users\Sarves Srirangan\apache-maven-3.9.9\bin\mvn.cmd" (
    "C:\Users\Sarves Srirangan\apache-maven-3.9.9\bin\mvn.cmd" %*
) else (
    echo Maven is not found. Please install Maven or add it to PATH.
    exit /b 1
)
