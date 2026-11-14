$WshShell = New-Object -ComObject WScript.Shell
$desktopPaths = @(
    [Environment]::GetFolderPath('Desktop'),
    'C:\Users\Sarves Srirangan\OneDrive\Desktop'
)

$targetScript = "C:\Users\Sarves Srirangan\OneDrive\Desktop\retailbillingsoftware\launch-retail-pos.vbs"
$workDir = "C:\Users\Sarves Srirangan\OneDrive\Desktop\retailbillingsoftware"

foreach ($desktop in $desktopPaths) {
    if (Test-Path $desktop) {
        $shortcutPath = Join-Path $desktop "Retail Billing Software.lnk"
        $shortcut = $WshShell.CreateShortcut($shortcutPath)
        $shortcut.TargetPath = "wscript.exe"
        $shortcut.Arguments = "`"$targetScript`""
        $shortcut.WorkingDirectory = $workDir
        $shortcut.Description = "Retail Billing & Inventory Management Software (POS)"
        $shortcut.IconLocation = "shell32.dll,130"
        $shortcut.Save()
        Write-Host "Created Desktop Shortcut at: $shortcutPath"
    }
}
