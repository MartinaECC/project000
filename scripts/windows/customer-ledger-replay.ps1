param(
  [string]$ProjectRoot = "D:\OpsAssistant\project000",
  [string]$NodePath = "D:\nodejs24\node.exe",
  [string]$EnvFile = ".env.intake.local",
  [switch]$DryRun,
  [int]$Limit = 20
)

$ErrorActionPreference = "Stop"
$argsList = @("scripts\replay_customer_ledger.mjs", "--env-file", $EnvFile, "--limit", "$Limit")
if ($DryRun) {
  $argsList += "--dry-run"
}

Push-Location $ProjectRoot
try {
  & $NodePath @argsList
  exit $LASTEXITCODE
} finally {
  Pop-Location
}
