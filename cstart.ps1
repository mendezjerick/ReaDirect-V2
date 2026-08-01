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
    [int]$ReverbPort = 8080,

    [ValidateNotNullOrEmpty()]
    [string]$PublicHostname = 'staging.readirect.org',

    [ValidateNotNullOrEmpty()]
    [string]$CloudflaredPath = 'C:\Cloudflared\bin\cloudflared.exe',

    [ValidateNotNullOrEmpty()]
    [string]$SourceCloudflareConfigPath = "$env:USERPROFILE\.cloudflared\config.yml",

    [ValidateRange(30, 600)]
    [int]$StartupTimeoutSeconds = 240,

    [switch]$Detached,

    [switch]$OpenBrowser
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repositoryRoot = (Resolve-Path -LiteralPath $PSScriptRoot).Path
$runtimeDirectory = Join-Path $repositoryRoot '.runtime'
$logDirectory = Join-Path $runtimeDirectory 'logs'
$localStartScriptPath = Join-Path $repositoryRoot 'start.ps1'
$localStopScriptPath = Join-Path $repositoryRoot 'stop.ps1'
$cloudManifestPath = Join-Path $runtimeDirectory 'cloud-services.json'
$cloudStopRequestPath = Join-Path $runtimeDirectory 'cloud-stop-requested'
$runtimeCloudflareConfigPath = Join-Path $runtimeDirectory 'cloudflare-config.yml'
$launcherOutputPath = Join-Path $logDirectory 'cloud-local-launcher.log'
$launcherErrorPath = Join-Path $logDirectory 'cloud-local-launcher.error.log'
$tunnelOutputPath = Join-Path $logDirectory 'cloudflare-tunnel.log'
$tunnelErrorPath = Join-Path $logDirectory 'cloudflare-tunnel.error.log'
$publicUrl = "https://$PublicHostname"
$localLauncherProcess = $null
$tunnelProcess = $null
$localServicesStarted = $false

function Write-Section {
    param([Parameter(Mandatory)][string]$Title)

    Write-Host ''
    Write-Host $Title -ForegroundColor Cyan
}

function Test-TcpPort {
    param([Parameter(Mandatory)][int]$Port)

    $client = [System.Net.Sockets.TcpClient]::new()

    try {
        $connection = $client.ConnectAsync('127.0.0.1', $Port)
        return $connection.Wait(300) -and $client.Connected
    }
    catch {
        return $false
    }
    finally {
        $client.Dispose()
    }
}

function Get-ProcessErrorTail {
    param(
        [Parameter(Mandatory)][string]$Path,
        [int]$LineCount = 25
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        return 'No error output was written.'
    }

    $tail = @(Get-Content -LiteralPath $Path -Tail $LineCount -ErrorAction SilentlyContinue)
    if ($tail.Count -eq 0) {
        return 'No error output was written.'
    }

    return $tail -join [Environment]::NewLine
}

function Stop-ProcessTree {
    param([Parameter(Mandatory)][int]$ProcessId)

    $childProcesses = Get-CimInstance Win32_Process -Filter "ParentProcessId = $ProcessId" -ErrorAction SilentlyContinue

    foreach ($childProcess in $childProcesses) {
        Stop-ProcessTree -ProcessId ([int]$childProcess.ProcessId)
    }

    Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
}

function Get-CloudflareSetting {
    param(
        [Parameter(Mandatory)][string]$Config,
        [Parameter(Mandatory)][string]$Name
    )

    $match = [regex]::Match(
        $Config,
        "(?mi)^\s*$([regex]::Escape($Name))\s*:\s*(?<value>[^\r\n#]+)"
    )

    if (-not $match.Success) {
        throw "Cloudflare setting '$Name' was not found in $SourceCloudflareConfigPath."
    }

    return $match.Groups['value'].Value.Trim().Trim('"').Trim("'")
}

function Resolve-CredentialsPath {
    param([Parameter(Mandatory)][string]$ConfiguredPath)

    if ([IO.Path]::IsPathRooted($ConfiguredPath)) {
        return $ConfiguredPath
    }

    $configDirectory = Split-Path -Parent (Resolve-Path -LiteralPath $SourceCloudflareConfigPath).Path
    return Join-Path $configDirectory $ConfiguredPath
}

function Assert-NoConflictingTunnel {
    param(
        [Parameter(Mandatory)][string]$TunnelId,
        [Parameter(Mandatory)][string]$SourceConfigPath
    )

    $escapedTunnelId = [regex]::Escape($TunnelId)
    $escapedSourceConfigPath = [regex]::Escape($SourceConfigPath)
    $escapedRuntimeConfigPath = [regex]::Escape($runtimeCloudflareConfigPath)

    $conflicts = @(
        Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
            Where-Object {
                $_.Name -match '^cloudflared(\.exe)?$' -and
                $_.CommandLine -and
                $_.CommandLine -match '\btunnel\b' -and
                $_.CommandLine -match '\brun\b' -and
                (
                    $_.CommandLine -match $escapedTunnelId -or
                    $_.CommandLine -match $escapedSourceConfigPath -or
                    $_.CommandLine -match $escapedRuntimeConfigPath
                )
            }
    )

    if ($conflicts.Count -gt 0) {
        throw "The '$TunnelId' Cloudflare tunnel is already running locally. Stop the holder tunnel or run .\cstop.ps1 before retrying."
    }
}

function Save-CloudManifest {
    param(
        [Parameter(Mandatory)][string]$TunnelId,
        [Parameter(Mandatory)][string]$CredentialsPath
    )

    $services = @()

    if ($localLauncherProcess) {
        $localLauncherProcess.Refresh()
        if (-not $localLauncherProcess.HasExited) {
            $services += [ordered]@{
                Name         = 'Local launcher'
                ProcessId    = $localLauncherProcess.Id
                StartTimeUtc = $localLauncherProcess.StartTime.ToUniversalTime().ToString('o')
            }
        }
    }

    if ($tunnelProcess) {
        $tunnelProcess.Refresh()
        if (-not $tunnelProcess.HasExited) {
            $services += [ordered]@{
                Name         = 'Cloudflare Tunnel'
                ProcessId    = $tunnelProcess.Id
                StartTimeUtc = $tunnelProcess.StartTime.ToUniversalTime().ToString('o')
            }
        }
    }

    $manifest = [ordered]@{
        Version          = 1
        RepositoryRoot   = $repositoryRoot
        PublicHostname   = $PublicHostname
        PublicUrl        = $publicUrl
        TunnelId         = $TunnelId
        CredentialsPath  = $CredentialsPath
        RuntimeConfig    = $runtimeCloudflareConfigPath
        CstartProcessId  = $PID
        UpdatedAtUtc     = [DateTime]::UtcNow.ToString('o')
        Services         = $services
    }

    $temporaryManifestPath = "$cloudManifestPath.tmp"
    $manifest | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $temporaryManifestPath -Encoding UTF8
    Move-Item -LiteralPath $temporaryManifestPath -Destination $cloudManifestPath -Force
}

function Wait-ForLocalServices {
    param(
        [Parameter(Mandatory)][Diagnostics.Process]$LauncherProcess,
        [Parameter(Mandatory)][System.Collections.IDictionary]$RequiredServices,
        [Parameter(Mandatory)][DateTime]$Deadline
    )

    $ready = @{}

    while ([DateTime]::UtcNow -lt $Deadline) {
        $LauncherProcess.Refresh()

        if ($LauncherProcess.HasExited) {
            $errorTail = Get-ProcessErrorTail -Path $launcherErrorPath
            throw "The local ReaDirect launcher exited before cloud readiness.$([Environment]::NewLine)$errorTail"
        }

        foreach ($serviceName in $RequiredServices.Keys) {
            $definition = $RequiredServices[$serviceName]
            $serviceReady = Test-TcpPort -Port ([int]$definition.Port)

            if ($serviceReady -and $definition.ReadinessPath) {
                try {
                    $readiness = Invoke-RestMethod `
                        -Uri "http://127.0.0.1:$($definition.Port)$($definition.ReadinessPath)" `
                        -TimeoutSec 5
                    $serviceReady = $readiness.status -eq 'ready'
                }
                catch {
                    $serviceReady = $false
                }
            }

            if (-not $ready.ContainsKey($serviceName) -and $serviceReady) {
                $ready[$serviceName] = $true
                Write-Host "  $($serviceName.PadRight(10))ready on port $($definition.Port)" -ForegroundColor Green
            }
        }

        if ($ready.Count -eq $RequiredServices.Count) {
            return
        }

        Start-Sleep -Milliseconds 400
    }

    $missing = @(
        $RequiredServices.Keys |
            Where-Object { -not $ready.ContainsKey($_) } |
            ForEach-Object { "$_ ($($RequiredServices[$_].Port))" }
    )

    throw "Cloud startup timed out waiting for: $($missing -join ', '). Check $logDirectory."
}

function Wait-ForPublicSite {
    param(
        [Parameter(Mandatory)][Diagnostics.Process]$CloudflareProcess,
        [Parameter(Mandatory)][DateTime]$Deadline
    )

    $lastError = 'No response was received.'

    while ([DateTime]::UtcNow -lt $Deadline) {
        $CloudflareProcess.Refresh()

        if ($CloudflareProcess.HasExited) {
            $errorTail = Get-ProcessErrorTail -Path $tunnelErrorPath
            throw "Cloudflare Tunnel exited before the public site became ready.$([Environment]::NewLine)$errorTail"
        }

        try {
            $response = Invoke-WebRequest -Uri $publicUrl -UseBasicParsing -TimeoutSec 15
            if ($response.StatusCode -eq 200 -and $response.Content -match '<div\s+id=["'']root["'']') {
                return
            }

            $lastError = "Received HTTP $($response.StatusCode), but the ReaDirect application shell was not detected."
        }
        catch {
            $lastError = $_.Exception.Message
        }

        Start-Sleep -Seconds 2
    }

    throw "The tunnel connected, but $publicUrl did not become ready. Last error: $lastError"
}

function Invoke-LocalStop {
    if (-not (Test-Path -LiteralPath $localStopScriptPath)) {
        return
    }

    try {
        & $localStopScriptPath `
            -WebPort $WebPort `
            -ApiPort $ApiPort `
            -AsrPort $AsrPort `
            -TtsPort $TtsPort `
            -ReverbPort $ReverbPort
    }
    catch {
        Write-Warning "The local stopper reported an error: $($_.Exception.Message)"
    }
}

New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null
Remove-Item -LiteralPath $cloudStopRequestPath -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath "$cloudManifestPath.tmp" -Force -ErrorAction SilentlyContinue

if ($Detached) {
    $hostOutputPath = Join-Path $logDirectory 'cstart-host.log'
    $hostErrorPath = Join-Path $logDirectory 'cstart-host.error.log'
    Remove-Item -LiteralPath $hostOutputPath -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $hostErrorPath -Force -ErrorAction SilentlyContinue

    $detachedArguments = @(
        '-NoProfile',
        '-File', "`"$PSCommandPath`"",
        '-WebPort', "$WebPort",
        '-ApiPort', "$ApiPort",
        '-AsrPort', "$AsrPort",
        '-TtsPort', "$TtsPort",
        '-ReverbPort', "$ReverbPort",
        '-PublicHostname', $PublicHostname,
        '-CloudflaredPath', "`"$CloudflaredPath`"",
        '-SourceCloudflareConfigPath', "`"$SourceCloudflareConfigPath`"",
        '-StartupTimeoutSeconds', "$StartupTimeoutSeconds"
    )

    if ($OpenBrowser) {
        $detachedArguments += '-OpenBrowser'
    }

    $detachedProcess = Start-Process `
        -FilePath (Join-Path $PSHOME 'powershell.exe') `
        -ArgumentList $detachedArguments `
        -WorkingDirectory $repositoryRoot `
        -RedirectStandardOutput $hostOutputPath `
        -RedirectStandardError $hostErrorPath `
        -WindowStyle Hidden `
        -PassThru

    Write-Host "ReaDirect cloud mode is starting in the background (PID $($detachedProcess.Id))." -ForegroundColor Green
    Write-Host "Startup log: $hostOutputPath"
    Write-Host "Error log:   $hostErrorPath"
    return
}

Write-Host 'ReaDirect Cloudflare staging launcher' -ForegroundColor Green
Write-Host "Repository: $repositoryRoot"
Write-Host "Public URL: $publicUrl"

try {
    foreach ($requiredPath in @($localStartScriptPath, $localStopScriptPath, $CloudflaredPath, $SourceCloudflareConfigPath)) {
        if (-not (Test-Path -LiteralPath $requiredPath)) {
            throw "Required path was not found: $requiredPath"
        }
    }

    $sourceConfig = Get-Content -LiteralPath $SourceCloudflareConfigPath -Raw
    $tunnelId = Get-CloudflareSetting -Config $sourceConfig -Name 'tunnel'
    $configuredCredentialsPath = Get-CloudflareSetting -Config $sourceConfig -Name 'credentials-file'
    $credentialsPath = Resolve-CredentialsPath -ConfiguredPath $configuredCredentialsPath

    if (-not (Test-Path -LiteralPath $credentialsPath)) {
        throw "Cloudflare tunnel credentials were not found: $credentialsPath"
    }

    if ($sourceConfig -notmatch "(?i)hostname\s*:\s*$([regex]::Escape($PublicHostname))(\s|$)") {
        throw "The source Cloudflare configuration does not own the expected hostname '$PublicHostname'."
    }

    Assert-NoConflictingTunnel -TunnelId $tunnelId -SourceConfigPath $SourceCloudflareConfigPath

    $knownPorts = [ordered]@{
            Web     = $WebPort
            API     = $ApiPort
            ASR     = $AsrPort
            TTS     = $TtsPort
            Reverb  = $ReverbPort
        }
    $occupiedPorts = @(
        $knownPorts.GetEnumerator() |
            Where-Object { Test-TcpPort -Port ([int]$_.Value) } |
            ForEach-Object { "$($_.Key) ($($_.Value))" }
    )

    if ($occupiedPorts.Count -gt 0) {
        throw "Cloud mode requires ownership of its services, but these ports are already in use: $($occupiedPorts -join ', '). Run .\stop.ps1 first."
    }

    $safeCredentialsPath = $credentialsPath.Replace("'", "''")
    $runtimeConfig = @"
tunnel: $tunnelId
credentials-file: '$safeCredentialsPath'

ingress:
  - hostname: $PublicHostname
    service: http://127.0.0.1:$WebPort
  - service: http_status:404
"@
    Set-Content -LiteralPath $runtimeCloudflareConfigPath -Value $runtimeConfig -Encoding UTF8

    Write-Section -Title 'Validating tunnel boundary'
    & $CloudflaredPath tunnel --config $runtimeCloudflareConfigPath ingress validate
    if ($LASTEXITCODE -ne 0) {
        throw "Cloudflare rejected the generated ingress configuration with exit code $LASTEXITCODE."
    }

    foreach ($blockedPort in @($ApiPort, $AsrPort, $TtsPort, $ReverbPort, 5432)) {
        if ($runtimeConfig -match "(127\.0\.0\.1|localhost|\[::1\]):$blockedPort") {
            throw "The generated tunnel configuration unexpectedly exposes blocked port $blockedPort."
        }
    }

    Write-Host "  Public hostname routes only to Web port $WebPort." -ForegroundColor Green

    $env:__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS = $PublicHostname
    $env:APP_URL = $publicUrl
    $env:APP_DEBUG = 'false'

    Write-Section -Title 'Starting local services'
    $powerShellPath = Join-Path $PSHOME 'powershell.exe'
    $launcherArguments = @(
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-File', "`"$localStartScriptPath`"",
        '-WebPort', "$WebPort",
        '-ApiPort', "$ApiPort",
        '-AsrPort', "$AsrPort",
        '-TtsPort', "$TtsPort",
        '-ReverbPort', "$ReverbPort",
        '-SpeechStartupTimeoutSeconds', "$StartupTimeoutSeconds",
        '-ProductionSpeechServices'
    )

    $localLauncherProcess = Start-Process `
        -FilePath $powerShellPath `
        -ArgumentList $launcherArguments `
        -WorkingDirectory $repositoryRoot `
        -RedirectStandardOutput $launcherOutputPath `
        -RedirectStandardError $launcherErrorPath `
        -WindowStyle Hidden `
        -PassThru
    $localServicesStarted = $true

    Save-CloudManifest -TunnelId $tunnelId -CredentialsPath $credentialsPath

    $startupDeadline = [DateTime]::UtcNow.AddSeconds($StartupTimeoutSeconds)
    $requiredServices = [ordered]@{
        Web = @{ Port = $WebPort; ReadinessPath = $null }
        API = @{ Port = $ApiPort; ReadinessPath = $null }
        ASR = @{ Port = $AsrPort; ReadinessPath = '/ready' }
        TTS = @{ Port = $TtsPort; ReadinessPath = '/health' }
    }
    Wait-ForLocalServices `
        -LauncherProcess $localLauncherProcess `
        -RequiredServices $requiredServices `
        -Deadline $startupDeadline

    Write-Section -Title 'Starting Cloudflare Tunnel'
    $tunnelArguments = @(
        'tunnel',
        '--config', "`"$runtimeCloudflareConfigPath`"",
        'run'
    )
    $tunnelProcess = Start-Process `
        -FilePath $CloudflaredPath `
        -ArgumentList $tunnelArguments `
        -WorkingDirectory $repositoryRoot `
        -RedirectStandardOutput $tunnelOutputPath `
        -RedirectStandardError $tunnelErrorPath `
        -WindowStyle Hidden `
        -PassThru

    Save-CloudManifest -TunnelId $tunnelId -CredentialsPath $credentialsPath
    Wait-ForPublicSite `
        -CloudflareProcess $tunnelProcess `
        -Deadline ([DateTime]::UtcNow.AddSeconds(90))

    Write-Host "  Tunnel    connected as $tunnelId" -ForegroundColor Green
    Write-Host "  Public    $publicUrl" -ForegroundColor White
    Write-Host ''
    Write-Host "Logs: $logDirectory" -ForegroundColor DarkGray
    Write-Host 'Run .\cstop.ps1 from another PowerShell window to stop cloud mode.' -ForegroundColor Cyan

    if ($OpenBrowser) {
        Start-Process $publicUrl
    }

    while ($true) {
        Start-Sleep -Milliseconds 500

        if (Test-Path -LiteralPath $cloudStopRequestPath) {
            Write-Host ''
            Write-Host 'Cloud stop requested by cstop.ps1.' -ForegroundColor Cyan
            break
        }

        $localLauncherProcess.Refresh()
        if ($localLauncherProcess.HasExited) {
            $errorTail = Get-ProcessErrorTail -Path $launcherErrorPath
            throw "The local ReaDirect launcher stopped unexpectedly.$([Environment]::NewLine)$errorTail"
        }

        $tunnelProcess.Refresh()
        if ($tunnelProcess.HasExited) {
            $errorTail = Get-ProcessErrorTail -Path $tunnelErrorPath
            throw "Cloudflare Tunnel stopped unexpectedly.$([Environment]::NewLine)$errorTail"
        }
    }
}
finally {
    if ($tunnelProcess) {
        $tunnelProcess.Refresh()
        if (-not $tunnelProcess.HasExited) {
            Stop-ProcessTree -ProcessId $tunnelProcess.Id
        }
    }

    if ($localServicesStarted) {
        Invoke-LocalStop
    }

    Remove-Item -LiteralPath $cloudManifestPath -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath "$cloudManifestPath.tmp" -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $runtimeCloudflareConfigPath -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $cloudStopRequestPath -Force -ErrorAction SilentlyContinue
}
