[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repositoryRoot = (Resolve-Path -LiteralPath $PSScriptRoot).Path
$runtimeDirectory = Join-Path $repositoryRoot '.runtime\production-models'
$manifestPath = Join-Path $runtimeDirectory 'services.json'
$stopRequestPath = Join-Path $runtimeDirectory 'stop-requested'
$tunnelTokenPath = Join-Path $runtimeDirectory 'cloudflare-tunnel-token'
$stopped = [System.Collections.Generic.List[string]]::new()

function Test-ManifestProcess {
    param([Parameter(Mandatory)][object]$Service)

    $process = Get-Process -Id ([int]$Service.ProcessId) -ErrorAction SilentlyContinue
    if (-not $process) {
        return $false
    }

    try {
        $recorded = [DateTime]::Parse(
            [string]$Service.StartTimeUtc,
            [Globalization.CultureInfo]::InvariantCulture,
            [Globalization.DateTimeStyles]::RoundtripKind
        ).ToUniversalTime()
        return [Math]::Abs(($process.StartTime.ToUniversalTime() - $recorded).TotalSeconds) -lt 1
    }
    catch {
        return $false
    }
}

function Stop-VerifiedProcessTree {
    param(
        [Parameter(Mandatory)][int]$ProcessId,
        [Parameter(Mandatory)][string]$Name
    )

    $children = Get-CimInstance Win32_Process -Filter "ParentProcessId = $ProcessId" -ErrorAction SilentlyContinue
    foreach ($child in $children) {
        Stop-VerifiedProcessTree -ProcessId $child.ProcessId -Name $Name
    }

    $process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
    if ($process) {
        Stop-Process -Id $ProcessId -Force -ErrorAction Stop
    }
    if (-not $stopped.Contains($Name)) {
        $stopped.Add($Name)
    }
}

Write-Host 'ReaDirect production model stopper' -ForegroundColor Green

New-Item -ItemType Directory -Force -Path $runtimeDirectory | Out-Null
[IO.File]::WriteAllText(
    $stopRequestPath,
    [DateTime]::UtcNow.ToString('O'),
    [Text.UTF8Encoding]::new($false)
)

if (Test-Path -LiteralPath $manifestPath) {
    $deadline = [DateTime]::UtcNow.AddSeconds(15)
    while ((Test-Path -LiteralPath $manifestPath) -and [DateTime]::UtcNow -lt $deadline) {
        Start-Sleep -Milliseconds 250
    }
}

if (Test-Path -LiteralPath $manifestPath) {
    $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
    if (-not [string]::Equals(
        [string]$manifest.RepositoryRoot,
        $repositoryRoot,
        [StringComparison]::OrdinalIgnoreCase
    )) {
        throw 'Refusing to stop processes from a manifest owned by another repository.'
    }

    foreach ($service in @($manifest.Services)) {
        if (Test-ManifestProcess -Service $service) {
            Stop-VerifiedProcessTree `
                -ProcessId ([int]$service.ProcessId) `
                -Name ([string]$service.Name)
        }
    }
}

Remove-Item -LiteralPath $tunnelTokenPath -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $manifestPath -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath "$manifestPath.tmp" -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $stopRequestPath -Force -ErrorAction SilentlyContinue

if ($stopped.Count -eq 0) {
    Write-Host 'No running production model services were found.' -ForegroundColor DarkYellow
}
else {
    Write-Host 'Stopped production model services:' -ForegroundColor Cyan
    foreach ($name in $stopped) {
        Write-Host "  $name" -ForegroundColor White
    }
}
