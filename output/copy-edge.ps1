Add-Type -AssemblyName System.Windows.Forms
$edge = Get-Process msedge | Where-Object { $_.MainWindowHandle -ne 0 -and ($_.MainWindowTitle -like '*AI知识库架构设计*' -or $_.MainWindowTitle -like '*ChatGPT*') } | Select-Object -First 1
$ws = New-Object -ComObject WScript.Shell
if ($edge) { [void]$ws.AppActivate($edge.Id) } else { [void]$ws.AppActivate('Microsoft Edge') }
Start-Sleep -Milliseconds 1000
[System.Windows.Forms.SendKeys]::SendWait('%d')
Start-Sleep -Milliseconds 500
[System.Windows.Forms.SendKeys]::SendWait('{ESC}')
Start-Sleep -Milliseconds 500
[System.Windows.Forms.SendKeys]::SendWait('^a')
Start-Sleep -Milliseconds 800
[System.Windows.Forms.SendKeys]::SendWait('^c')
Start-Sleep -Milliseconds 1000
Get-Clipboard -Raw
