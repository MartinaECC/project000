param(
  [string]$ServiceName = "OpsAssistantCustomerLedger",
  [string]$ProjectRoot = "D:\OpsAssistant\project000",
  [string]$NodePath = "D:\nodejs24\node.exe",
  [string]$NssmPath = "C:\nssm\nssm.exe",
  [string]$EnvFile = ".env.intake.local",
  [string]$LogDir = "D:\OpsAssistant\logs"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $NssmPath)) {
  throw "NSSM not found at $NssmPath. Download NSSM and pass -NssmPath, or install it to C:\nssm\nssm.exe."
}
if (-not (Test-Path -LiteralPath $NodePath)) {
  throw "Node.js not found at $NodePath."
}
if (-not (Test-Path -LiteralPath $ProjectRoot)) {
  throw "Project root not found: $ProjectRoot."
}

New-Item -ItemType Directory -Path $LogDir -Force | Out-Null

& $NssmPath stop $ServiceName 2>$null | Out-Null
& $NssmPath remove $ServiceName confirm 2>$null | Out-Null

& $NssmPath install $ServiceName $NodePath "scripts\start_intake.mjs"
& $NssmPath set $ServiceName AppDirectory $ProjectRoot
& $NssmPath set $ServiceName AppEnvironmentExtra "DINGTALK_ENV_FILE=$EnvFile" "OPS_ASSISTANT_LOG_DIR=$LogDir"
& $NssmPath set $ServiceName AppStdout (Join-Path $LogDir "nssm-stdout.log")
& $NssmPath set $ServiceName AppStderr (Join-Path $LogDir "nssm-stderr.log")
& $NssmPath set $ServiceName AppRotateFiles 1
& $NssmPath set $ServiceName AppRotateOnline 1
& $NssmPath set $ServiceName AppRotateBytes 10485760
& $NssmPath set $ServiceName AppThrottle 1500
& $NssmPath set $ServiceName Start SERVICE_AUTO_START
& $NssmPath set $ServiceName AppExit Default Restart

& $NssmPath start $ServiceName

Write-Host "Installed and started $ServiceName"
Write-Host "ProjectRoot=$ProjectRoot"
Write-Host "LogDir=$LogDir"
