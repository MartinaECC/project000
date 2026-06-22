[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$AutomationId,

    [Parameter(Mandatory = $true)]
    [string]$Action,

    [string]$PayloadText,

    [string]$PayloadFile,

    [string[]]$CommandArgs,

    [string]$ConfigPath = "E:\Workspace_codex\project000\scripts\automation\reporting-config.json",

    [string]$AutomationsRoot = "C:\Users\Administrator\.codex\automations",

    [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Set-Utf8Output {
    $utf8NoBom = [System.Text.UTF8Encoding]::new($false)
    $script:OutputEncoding = $utf8NoBom
    [Console]::OutputEncoding = $utf8NoBom
}

function Read-JsonConfig {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        return [pscustomobject]@{
            version = 1
            mode = "local-only"
            feishu_write_enabled = $false
            notes = "Missing config. Defaulting to local-only."
        }
    }

    return Get-Content -LiteralPath $Path -Raw -Encoding UTF8 | ConvertFrom-Json
}

function Normalize-PayloadToUtf8File {
    param(
        [string]$Text,
        [string]$FilePath,
        [string]$ActionName
    )

    if ([string]::IsNullOrEmpty($Text) -and [string]::IsNullOrEmpty($FilePath)) {
        return $null
    }

    $content = if (-not [string]::IsNullOrEmpty($FilePath)) {
        Get-Content -LiteralPath $FilePath -Raw -Encoding UTF8
    }
    else {
        $Text
    }

    $extension = if ($ActionName -like "base-*") { ".json" } else { ".xml" }
    $tempDir = Join-Path (Get-Location).Path "tmp\automation-payloads"
    if (-not (Test-Path -LiteralPath $tempDir)) {
        New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
    }
    $tempFile = Join-Path $tempDir ("codex-feishu-" + [guid]::NewGuid().ToString("N") + $extension)
    $utf8NoBom = [System.Text.UTF8Encoding]::new($false)
    [System.IO.File]::WriteAllText($tempFile, $content, $utf8NoBom)
    return $tempFile
}

function Get-CommandPayloadPath {
    param(
        [string]$NormalizedFile
    )

    if ([string]::IsNullOrEmpty($NormalizedFile)) {
        return $NormalizedFile
    }

    return [System.IO.Path]::GetRelativePath((Get-Location).Path, $NormalizedFile)
}

function Get-PayloadBytes {
    param(
        [string]$NormalizedFile
    )

    if ([string]::IsNullOrEmpty($NormalizedFile)) {
        return [byte[]]::new(0)
    }

    return [System.IO.File]::ReadAllBytes($NormalizedFile)
}

function Get-PreviewText {
    param(
        [byte[]]$Bytes
    )

    if ($Bytes.Length -eq 0) {
        return ""
    }

    $text = [System.Text.Encoding]::UTF8.GetString($Bytes)
    $text = $text -replace "\r?\n", " "
    if ($text.Length -gt 80) {
        return $text.Substring(0, 80)
    }
    return $text
}

function Get-HexPrefix {
    param(
        [byte[]]$Bytes
    )

    if ($Bytes.Length -eq 0) {
        return ""
    }

    $count = [Math]::Min(32, $Bytes.Length)
    return ([System.BitConverter]::ToString($Bytes, 0, $count)).Replace("-", "").ToLowerInvariant()
}

function Write-StructuredLog {
    param(
        [Parameter(Mandatory = $true)]
        [hashtable]$Entry,

        [Parameter(Mandatory = $true)]
        [string]$Root,

        [Parameter(Mandatory = $true)]
        [string]$Id
    )

    $logDir = Join-Path $Root "$Id\logs"
    if (-not (Test-Path -LiteralPath $logDir)) {
        New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    }

    $logPath = Join-Path $logDir "feishu-write.ndjson"
    $json = ($Entry | ConvertTo-Json -Compress -Depth 6)
    $utf8NoBom = [System.Text.UTF8Encoding]::new($false)
    $line = $json + [Environment]::NewLine

    for ($attempt = 1; $attempt -le 5; $attempt++) {
        try {
            [System.IO.File]::AppendAllText($logPath, $line, $utf8NoBom)
            break
        }
        catch [System.IO.IOException] {
            if ($attempt -eq 5) {
                throw
            }
            Start-Sleep -Milliseconds (50 * $attempt)
        }
    }

    return $logPath
}

Set-Utf8Output

$config = Read-JsonConfig -Path $ConfigPath
$normalizedFile = Normalize-PayloadToUtf8File -Text $PayloadText -FilePath $PayloadFile -ActionName $Action
$payloadBytes = Get-PayloadBytes -NormalizedFile $normalizedFile
$payloadSource = if (-not [string]::IsNullOrEmpty($PayloadFile)) {
    "utf8-file"
}
elseif (-not [string]::IsNullOrEmpty($PayloadText)) {
    "pipe-string"
}
else {
    "other"
}

$entry = [ordered]@{
    timestamp = (Get-Date).ToString("o")
    automation_id = $AutomationId
    action = $Action
    console_output_encoding = [Console]::OutputEncoding.WebName
    pipeline_output_encoding = $OutputEncoding.WebName
    system_default_encoding = [System.Text.Encoding]::Default.WebName
    payload_source = $payloadSource
    payload_preview = Get-PreviewText -Bytes $payloadBytes
    payload_hex_prefix = Get-HexPrefix -Bytes $payloadBytes
    dry_run = [bool]$DryRun
    feishu_write_enabled = [bool]$config.feishu_write_enabled
    mode = $config.mode
    command_args = $CommandArgs
}

if (-not $config.feishu_write_enabled) {
    $entry.result = "skipped"
    $entry.skip_reason = "feishu_write_disabled"
    $logPath = Write-StructuredLog -Entry $entry -Root $AutomationsRoot -Id $AutomationId
    [pscustomobject]@{
        ok = $true
        feishu_write_skipped = $true
        reason = "feishu_write_disabled"
        log_path = $logPath
        normalized_payload_file = $normalizedFile
    } | ConvertTo-Json -Compress
    exit 0
}

if ($DryRun -or -not $CommandArgs -or $CommandArgs.Count -eq 0) {
    $entry.result = "dry_run"
    $logPath = Write-StructuredLog -Entry $entry -Root $AutomationsRoot -Id $AutomationId
    [pscustomobject]@{
        ok = $true
        feishu_write_skipped = $false
        dry_run = $true
        log_path = $logPath
        normalized_payload_file = $normalizedFile
    } | ConvertTo-Json -Compress
    exit 0
}

$resolvedArgs = foreach ($arg in $CommandArgs) {
    if ($arg -like "*__PAYLOAD_FILE__*") {
        $arg.Replace("__PAYLOAD_FILE__", (Get-CommandPayloadPath -NormalizedFile $normalizedFile))
    }
    else {
        $arg
    }
}

$command = $resolvedArgs[0]
$arguments = if ($resolvedArgs.Count -gt 1) { $resolvedArgs[1..($resolvedArgs.Count - 1)] } else { @() }
$output = & $command @arguments 2>&1
$exitCode = $LASTEXITCODE
$outputText = ($output | Out-String).Trim()

$entry.exit_code = $exitCode
$entry.result = if ($exitCode -eq 0) { "executed" } else { "failed" }
if ($outputText.Length -gt 400) {
    $entry.output_preview = $outputText.Substring(0, 400)
}
else {
    $entry.output_preview = $outputText
}

$logPath = Write-StructuredLog -Entry $entry -Root $AutomationsRoot -Id $AutomationId

[pscustomobject]@{
    ok = ($exitCode -eq 0)
    feishu_write_skipped = $false
    dry_run = $false
    exit_code = $exitCode
    log_path = $logPath
    normalized_payload_file = $normalizedFile
    output = $outputText
} | ConvertTo-Json -Compress

if ($exitCode -ne 0) {
    exit $exitCode
}
