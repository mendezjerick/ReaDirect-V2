[CmdletBinding()]
param(
    [ValidateRange(1, 65535)]
    [int]$WebPort = 5174,

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
$serviceManifestPath = Join-Path $runtimeDirectory 'services.json'
$stopRequestPath = Join-Path $runtimeDirectory 'stop-requested'
$stoppedProcessIds = [System.Collections.Generic.HashSet[int]]::new()
$stoppedServices = [System.Collections.Generic.List[object]]::new()
$warnings = [System.Collections.Generic.List[string]]::new()

function Stop-VerifiedProcessTree {
    param(
        [Parameter(Mandatory)][int]$ProcessId,
        [Parameter(Mandatory)][string]$ServiceName,
        [Parameter(Mandatory)][int]$Port
    )

    if ($stoppedProcessIds.Contains($ProcessId)) {
        return
    }

    $childProcesses = Get-CimInstance Win32_Process -Filter "ParentProcessId = $ProcessId" -ErrorAction SilentlyContinue

    foreach ($childProcess in $childProcesses) {
        Stop-VerifiedProcessTree `
            -ProcessId $childProcess.ProcessId `
            -ServiceName $ServiceName `
            -Port $Port
    }

    $process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
    if ($process) {
        Stop-Process -Id $ProcessId -Force -ErrorAction Stop
        $null = $stoppedProcessIds.Add($ProcessId)
    }

    if (-not ($stoppedServices | Where-Object { $_.Name -eq $ServiceName -and $_.Port -eq $Port })) {
        $stoppedServices.Add([pscustomobject]@{
                Name = $ServiceName
                Port = $Port
            })
    }
}

function Test-ManifestProcess {
    param([Parameter(Mandatory)][object]$Service)

    $process = Get-Process -Id ([int]$Service.ProcessId) -ErrorAction SilentlyContinue
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

function Test-WorkspaceProcess {
    param([Parameter(Mandatory)][int]$ProcessId)

    $process = Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction SilentlyContinue
    if (-not $process) {
        return $false
    }

    $repositoryPrefix = $repositoryRoot.ToLowerInvariant()
    $commandLine = if ($process.CommandLine) { $process.CommandLine.ToLowerInvariant() } else { '' }
    $executablePath = if ($process.ExecutablePath) { $process.ExecutablePath.ToLowerInvariant() } else { '' }

    return $commandLine.Contains($repositoryPrefix) -or $executablePath.StartsWith($repositoryPrefix)
}

Write-Host 'ReaDirect service stopper' -ForegroundColor Green
Write-Host "Repository: $repositoryRoot"
Write-Host ''

New-Item -ItemType Directory -Force -Path $runtimeDirectory | Out-Null
Set-Content -LiteralPath $stopRequestPath -Value ([DateTime]::UtcNow.ToString('O'))

if (Test-Path -LiteralPath $serviceManifestPath) {
    try {
        $manifest = Get-Content -LiteralPath $serviceManifestPath -Raw | ConvertFrom-Json
        $manifestRoot = [string]$manifest.RepositoryRoot

        if (-not [string]::Equals($manifestRoot, $repositoryRoot, [StringComparison]::OrdinalIgnoreCase)) {
            $warnings.Add('Ignored the service manifest because it belongs to a different repository path.')
        }
        else {
            foreach ($service in @($manifest.Services)) {
                if (Test-ManifestProcess -Service $service) {
                    Stop-VerifiedProcessTree `
                        -ProcessId ([int]$service.ProcessId) `
                        -ServiceName ([string]$service.Name) `
                        -Port ([int]$service.Port)
                }
            }
        }
    }
    catch {
        $warnings.Add("Could not use the service manifest: $($_.Exception.Message)")
    }
}

$knownPorts = [ordered]@{
    Web    = $WebPort
    API    = $ApiPort
    ASR    = $AsrPort
    TTS    = $TtsPort
    Reverb = $ReverbPort
}

foreach ($serviceName in $knownPorts.Keys) {
    $port = [int]$knownPorts[$serviceName]
    $listeners = @(Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)

    foreach ($listener in $listeners) {
        $listenerProcessId = [int]$listener.OwningProcess

        if ($stoppedProcessIds.Contains($listenerProcessId)) {
            continue
        }

        if (Test-WorkspaceProcess -ProcessId $listenerProcessId) {
            Stop-VerifiedProcessTree `
                -ProcessId $listenerProcessId `
                -ServiceName $serviceName `
                -Port $port
        }
        else {
            $warnings.Add("Left port $port untouched because its listener could not be verified as a ReaDirect process.")
        }
    }
}

Remove-Item -LiteralPath $serviceManifestPath -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath "$serviceManifestPath.tmp" -Force -ErrorAction SilentlyContinue

if ($stoppedServices.Count -eq 0) {
    Write-Host 'No running ReaDirect services were found.' -ForegroundColor DarkYellow
}
else {
    Write-Host 'Stopped services' -ForegroundColor Cyan
    foreach ($service in $stoppedServices) {
        $location = if ($service.Port -gt 0) { "port $($service.Port)" } else { 'background process' }
        Write-Host "  $($service.Name.PadRight(16))$location" -ForegroundColor White
    }
}

if ($warnings.Count -gt 0) {
    Write-Host ''
    Write-Host 'Warnings' -ForegroundColor DarkYellow
    foreach ($warning in $warnings) {
        Write-Host "  $warning" -ForegroundColor DarkYellow
    }
}
