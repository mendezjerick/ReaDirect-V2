[CmdletBinding()]
param(
    [ValidateRange(1, 65535)]
    [int]$WebPort = 5173,

    [ValidateRange(1, 65535)]
    [int]$ApiPort = 8000,

    [ValidateRange(1, 65535)]
    [int]$AsrPort = 8001,

    [ValidateRange(1, 65535)]
    [int]$TtsPort = 8002,

    [ValidateRange(1, 65535)]
    [int]$ReverbPort = 8080
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repositoryRoot = (Resolve-Path -LiteralPath $PSScriptRoot).Path
$runtimeDirectory = Join-Path $repositoryRoot '.runtime'
$cloudManifestPath = Join-Path $runtimeDirectory 'cloud-services.json'
$cloudStopRequestPath = Join-Path $runtimeDirectory 'cloud-stop-requested'
$runtimeCloudflareConfigPath = Join-Path $runtimeDirectory 'cloudflare-config.yml'
$localStopScriptPath = Join-Path $repositoryRoot 'stop.ps1'
$stoppedProcessIds = [System.Collections.Generic.HashSet[int]]::new()
$warnings = [System.Collections.Generic.List[string]]::new()

function Test-RecordedProcess {
    param([Parameter(Mandatory)][object]$Service)

    $processId = [int]$Service.ProcessId
    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
    if (-not $process) {
        return $false
    }

    try {
        $recordedStartTime = [DateTime]::Parse(
            [string]$Service.StartTimeUtc,
            [Globalization.CultureInfo]::InvariantCulture,
            [Globalization.DateTimeStyles]::RoundtripKind
        ).ToUniversalTime()
        $actualStartTime = $process.StartTime.ToUniversalTime()

        return [Math]::Abs(($actualStartTime - $recordedStartTime).TotalSeconds) -lt 1
    }
    catch {
        return $false
    }
}

function Stop-VerifiedProcessTree {
    param(
        [Parameter(Mandatory)][int]$ProcessId,
        [Parameter(Mandatory)][string]$Reason
    )

    if ($ProcessId -eq $PID -or $stoppedProcessIds.Contains($ProcessId)) {
        return
    }

    $childProcesses = Get-CimInstance Win32_Process -Filter "ParentProcessId = $ProcessId" -ErrorAction SilentlyContinue
    foreach ($childProcess in $childProcesses) {
        Stop-VerifiedProcessTree -ProcessId ([int]$childProcess.ProcessId) -Reason $Reason
    }

    $process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
    if ($process) {
        Stop-Process -Id $ProcessId -Force -ErrorAction Stop
        $null = $stoppedProcessIds.Add($ProcessId)
        Write-Host "  Stopped $Reason (PID $ProcessId)" -ForegroundColor White
    }
}

Write-Host 'ReaDirect cloud service stopper' -ForegroundColor Green
Write-Host "Repository: $repositoryRoot"
Write-Host ''

New-Item -ItemType Directory -Force -Path $runtimeDirectory | Out-Null

$manifest = $null
$cloudRuntimeWasPresent = (Test-Path -LiteralPath $cloudManifestPath) -or
    (Test-Path -LiteralPath $runtimeCloudflareConfigPath)
if (Test-Path -LiteralPath $cloudManifestPath) {
    try {
        $manifest = Get-Content -LiteralPath $cloudManifestPath -Raw | ConvertFrom-Json

        if (-not [string]::Equals(
                [string]$manifest.RepositoryRoot,
                $repositoryRoot,
                [StringComparison]::OrdinalIgnoreCase
            )) {
            $warnings.Add('Ignored the cloud manifest because it belongs to a different repository path.')
            $manifest = $null
        }
    }
    catch {
        $warnings.Add("Could not read the cloud manifest: $($_.Exception.Message)")
        $manifest = $null
    }
}

Set-Content -LiteralPath $cloudStopRequestPath -Value ([DateTime]::UtcNow.ToString('o')) -Encoding UTF8

$gracefulStopCompleted = $false
if ($manifest -and $manifest.CstartProcessId) {
    $cstartProcessId = [int]$manifest.CstartProcessId
    $deadline = [DateTime]::UtcNow.AddSeconds(15)

    while ([DateTime]::UtcNow -lt $deadline) {
        if (-not (Get-Process -Id $cstartProcessId -ErrorAction SilentlyContinue)) {
            $gracefulStopCompleted = $true
            break
        }

        Start-Sleep -Milliseconds 250
    }
}

if ($manifest) {
    $tunnelServices = @(
        $manifest.Services |
            Where-Object { [string]$_.Name -eq 'Cloudflare Tunnel' }
    )

    foreach ($service in $tunnelServices) {
        if (-not $gracefulStopCompleted -and (Test-RecordedProcess -Service $service)) {
            Stop-VerifiedProcessTree `
                -ProcessId ([int]$service.ProcessId) `
                -Reason 'ReaDirect Cloudflare Tunnel'
        }
    }
}

$escapedRuntimeConfigPath = [regex]::Escape($runtimeCloudflareConfigPath)
$fallbackTunnelProcesses = @(
    Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
        Where-Object {
            $_.ProcessId -ne $PID -and
            $_.Name -match '^cloudflared(\.exe)?$' -and
            $_.CommandLine -and
            $_.CommandLine -match '\btunnel\b' -and
            $_.CommandLine -match '\brun\b' -and
            $_.CommandLine -match $escapedRuntimeConfigPath
        }
)

if (-not $gracefulStopCompleted) {
    foreach ($process in $fallbackTunnelProcesses) {
        Stop-VerifiedProcessTree `
            -ProcessId ([int]$process.ProcessId) `
            -Reason 'ReaDirect Cloudflare Tunnel'
    }
}

$localServicePorts = @($WebPort, $ApiPort, $AsrPort, $TtsPort, $ReverbPort)
$localServicesStillListening = @(
    $localServicePorts |
        Where-Object {
            @(Get-NetTCPConnection -LocalPort $_ -State Listen -ErrorAction SilentlyContinue).Count -gt 0
        }
).Count -gt 0

if ($localServicesStillListening -and (Test-Path -LiteralPath $localStopScriptPath)) {
    try {
        & $localStopScriptPath `
            -WebPort $WebPort `
            -ApiPort $ApiPort `
            -AsrPort $AsrPort `
            -TtsPort $TtsPort `
            -ReverbPort $ReverbPort
    }
    catch {
        $warnings.Add("The local service stopper reported an error: $($_.Exception.Message)")
    }
}
elseif ($localServicesStillListening) {
    $warnings.Add("The local stopper was not found: $localStopScriptPath")
}

Remove-Item -LiteralPath $cloudManifestPath -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath "$cloudManifestPath.tmp" -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $runtimeCloudflareConfigPath -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $cloudStopRequestPath -Force -ErrorAction SilentlyContinue

if ($stoppedProcessIds.Count -eq 0 -and $cloudRuntimeWasPresent) {
    Write-Host 'Cloudflare Tunnel exited after the graceful stop request.' -ForegroundColor White
}
elseif ($stoppedProcessIds.Count -eq 0) {
    Write-Host 'No repository-scoped Cloudflare Tunnel process was running.' -ForegroundColor DarkYellow
}

if ($warnings.Count -gt 0) {
    Write-Host ''
    Write-Host 'Warnings' -ForegroundColor DarkYellow
    foreach ($warning in $warnings) {
        Write-Host "  $warning" -ForegroundColor DarkYellow
    }
}

Write-Host ''
Write-Host 'ReaDirect cloud services are stopped. PostgreSQL was left running.' -ForegroundColor Green
