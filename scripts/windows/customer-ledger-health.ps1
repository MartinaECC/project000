param(
  [string]$ProjectRoot = "D:\OpsAssistant\project000",
  [string]$LogDir = "D:\OpsAssistant\logs",
  [int]$MaxLogAgeMinutes = 30,
  [int]$MaxConnectAgeHours = 24
)

$ErrorActionPreference = "Stop"
$outLog = Join-Path $LogDir "ecocc-intake.out.log"
$errLog = Join-Path $LogDir "ecocc-intake.err.log"
$processes = Get-CimInstance Win32_Process |
  Where-Object {
    $_.Name -eq "node.exe" -and (
      $_.CommandLine -match "src/index.ts --env-file" -or
      $_.CommandLine -match "scripts\\start_intake\.mjs" -or
      $_.CommandLine -match "scripts/start_intake\.mjs"
    )
  }

$result = [ordered]@{
  ok = $true
  checkedAt = (Get-Date).ToString("o")
  projectRoot = $ProjectRoot
  logDir = $LogDir
  processCount = @($processes).Count
  outLogExists = Test-Path -LiteralPath $outLog
  errLogExists = Test-Path -LiteralPath $errLog
  outLogLastWriteTime = $null
  latestConnectSuccess = $null
  latestMessageReceived = $null
  warnings = @()
}

if ($result.processCount -lt 1) {
  $result.ok = $false
  $result.warnings += "No running customer ledger intake process found."
}

if (-not $result.outLogExists) {
  $result.ok = $false
  $result.warnings += "Missing out log: $outLog"
} else {
  $outItem = Get-Item -LiteralPath $outLog
  $result.outLogLastWriteTime = $outItem.LastWriteTime.ToString("o")
  if ($outItem.LastWriteTime -lt (Get-Date).AddMinutes(-$MaxLogAgeMinutes)) {
    $result.warnings += "Out log has not changed within $MaxLogAgeMinutes minutes."
  }

  $tail = Get-Content -LiteralPath $outLog -Tail 500
  $latestConnect = $tail | Select-String "connect success" | Select-Object -Last 1
  if ($latestConnect) {
    $result.latestConnectSuccess = $latestConnect.Line
  } else {
    $result.ok = $false
    $result.warnings += "No recent Stream connect success found in log tail."
  }

  $latestMessage = $tail | Select-String '"event":"stream.robot.message.received"' | Select-Object -Last 1
  if ($latestMessage) {
    $result.latestMessageReceived = $latestMessage.Line
  }
}

if ($result.errLogExists) {
  $errItem = Get-Item -LiteralPath $errLog
  $outItem = if ($result.outLogExists) { Get-Item -LiteralPath $outLog } else { $null }
  $recentErrors = Get-Content -LiteralPath $errLog -Tail 80 | Where-Object { $_ -match "Error|Unhandled|Exception" }
  if ($recentErrors -and (-not $outItem -or $errItem.LastWriteTime -gt $outItem.LastWriteTime)) {
    $result.warnings += "Recent stderr contains errors; inspect $errLog."
  }
}

$result | ConvertTo-Json -Depth 5
if (-not $result.ok) {
  exit 1
}
