param(
  [int]$MaxPages = 90,
  [string]$OutDir = "E:\Workspace_codex\project000\output\weread_pages"
)

Add-Type -AssemblyName System.Drawing,System.Windows.Forms
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32WereadCapture {
 [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
 [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
 [DllImport("user32.dll")] public static extern bool SetCursorPos(int X, int Y);
 [DllImport("user32.dll")] public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, UIntPtr dwExtraInfo);
}
public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
"@

function ClickAbs([int]$x, [int]$y) {
  [Win32WereadCapture]::SetCursorPos($x, $y) | Out-Null
  Start-Sleep -Milliseconds 80
  [Win32WereadCapture]::mouse_event(0x0002,0,0,0,[UIntPtr]::Zero)
  Start-Sleep -Milliseconds 60
  [Win32WereadCapture]::mouse_event(0x0004,0,0,0,[UIntPtr]::Zero)
  Start-Sleep -Milliseconds 250
}

function CaptureWindow([string]$path, $rect) {
  $width = $rect.Right - $rect.Left
  $height = $rect.Bottom - $rect.Top
  $bmp = New-Object System.Drawing.Bitmap($width, $height)
  $graphics = [System.Drawing.Graphics]::FromImage($bmp)
  $graphics.CopyFromScreen($rect.Left, $rect.Top, 0, 0, $bmp.Size)
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose()
  $bmp.Dispose()
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$process = Get-Process msedge | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if (-not $process) { throw "Edge main window not found." }

[Win32WereadCapture]::SetForegroundWindow($process.MainWindowHandle) | Out-Null
Start-Sleep -Milliseconds 500
$rect = New-Object RECT
[Win32WereadCapture]::GetWindowRect($process.MainWindowHandle, [ref]$rect) | Out-Null

# Focus the reader text area so right-arrow advances pages.
ClickAbs ($rect.Left + 1250) ($rect.Top + 450)

for ($i = 1; $i -le $MaxPages; $i++) {
  $path = Join-Path $OutDir ("page_{0:D3}.png" -f $i)
  CaptureWindow $path $rect
  Write-Output $path
  [System.Windows.Forms.SendKeys]::SendWait('{RIGHT}')
  Start-Sleep -Milliseconds 900
}
