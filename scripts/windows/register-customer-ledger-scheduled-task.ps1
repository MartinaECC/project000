param(
  [string]$TaskName = "OpsAssistantCustomerLedger",
  [string]$ProjectRoot = "E:\Workspace_codex\project000",
  [string]$NodePath = "D:\nodejs24\node.exe",
  [string]$EnvFile = ".env.intake.local",
  [string]$LogDir = "E:\Workspace_codex\project000\logs",
  [switch]$StartNow
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $NodePath)) {
  throw "Node.js not found at $NodePath."
}
if (-not (Test-Path -LiteralPath $ProjectRoot)) {
  throw "Project root not found: $ProjectRoot."
}

New-Item -ItemType Directory -Path $LogDir -Force | Out-Null

$script = @"
Set-Location -LiteralPath "$ProjectRoot"
`$env:DINGTALK_ENV_FILE = "$EnvFile"
`$env:OPS_ASSISTANT_LOG_DIR = "$LogDir"
& "$NodePath" "scripts\start_intake.mjs"
exit `$LASTEXITCODE
"@

$launcherDir = Join-Path $env:LOCALAPPDATA "OpsAssistant"
New-Item -ItemType Directory -Path $launcherDir -Force | Out-Null
$launcherPath = Join-Path $launcherDir "run-customer-ledger-task.ps1"
Set-Content -Path $launcherPath -Value $script -Encoding UTF8

$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$launcherPath`"" `
  -WorkingDirectory $ProjectRoot

$triggers = @(
  (New-ScheduledTaskTrigger -AtLogOn),
  (New-ScheduledTaskTrigger -AtStartup)
)

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit (New-TimeSpan -Days 0) `
  -MultipleInstances IgnoreNew `
  -RestartCount 999 `
  -RestartInterval (New-TimeSpan -Minutes 1) `
  -StartWhenAvailable

$principal = New-ScheduledTaskPrincipal `
  -UserId $env:USERNAME `
  -LogonType Interactive `
  -RunLevel Highest

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $triggers `
  -Settings $settings `
  -Principal $principal `
  -Description "Runs the Ops Assistant customer ledger DingTalk Stream service." `
  -Force | Out-Null

if ($StartNow) {
  Start-ScheduledTask -TaskName $TaskName
}

Write-Host "Registered scheduled task: $TaskName"
Write-Host "Launcher: $launcherPath"
Write-Host "ProjectRoot: $ProjectRoot"
Write-Host "LogDir: $LogDir"
