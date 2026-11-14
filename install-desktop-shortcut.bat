@echo off
title Install Retail POS Desktop Shortcut
cd /d "%~dp0"

echo =========================================================
echo       INSTALLING RETAIL BILLING SOFTWARE SHORTCUT        
echo =========================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $d = [Environment]::GetFolderPath('Desktop'); $s = $ws.CreateShortcut((Join-Path $d 'Retail Billing Software.lnk')); $s.TargetPath = 'wscript.exe'; $s.Arguments = '\"' + (Join-Path (Get-Location) 'launch-retail-pos.vbs') + '\"'; $s.WorkingDirectory = (Get-Location).Path; $s.Description = 'Retail Billing & Inventory Management Software (POS)'; $s.IconLocation = 'shell32.dll,130'; $s.Save(); Write-Host '  [OK] Desktop shortcut created successfully on your Desktop!'"

echo.
echo Setup completed! You can now double-click "Retail Billing Software" on your Desktop.
echo.
pause
