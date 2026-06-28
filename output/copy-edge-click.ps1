Add-Type -AssemblyName System.Windows.Forms
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class MouseUtil {
 [DllImport("user32.dll")] public static extern bool SetCursorPos(int X, int Y);
 [DllImport("user32.dll")] public static extern void mouse_event(int dwFlags, int dx, int dy, int cButtons, int dwExtraInfo);
}
"@
$edge = Get-Process msedge | Where-Object { $_.MainWindowHandle -ne 0 -and ($_.MainWindowTitle -like '*AI知识库架构设计*' -or $_.MainWindowTitle -like '*ChatGPT*') } | Select-Object -First 1
$ws = New-Object -ComObject WScript.Shell
if ($edge) { [void]$ws.AppActivate($edge.Id) }
Start-Sleep -Milliseconds 800
[MouseUtil]::SetCursorPos(950,500) | Out-Null
Start-Sleep -Milliseconds 200
[MouseUtil]::mouse_event(0x0002,0,0,0,0)
Start-Sleep -Milliseconds 100
[MouseUtil]::mouse_event(0x0004,0,0,0,0)
Start-Sleep -Milliseconds 500
[System.Windows.Forms.SendKeys]::SendWait('^a')
Start-Sleep -Milliseconds 800
[System.Windows.Forms.SendKeys]::SendWait('^c')
Start-Sleep -Milliseconds 1200
Get-Clipboard -Raw
