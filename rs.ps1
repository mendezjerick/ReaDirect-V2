[CmdletBinding()]
param(
    [ValidateRange(1, 65535)]
    [int]$AsrPort = 8001,

    [ValidateRange(1, 65535)]
    [int]$TtsPort = 8002,

    [ValidateRange(30, 3600)]
    [int]$StartupTimeoutSeconds = 1000,

    [ValidateNotNullOrEmpty()]
    [string]$CloudflaredPath = 'C:\Program Files (x86)\cloudflared\cloudflared.exe',

    [ValidatePattern('^[0-9a-fA-F-]{36}$')]
    [string]$TunnelId = '9b43367e-72f0-486c-9a8a-d35163fa71c6',

    [switch]$ResetSecrets
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repositoryRoot = (Resolve-Path -LiteralPath $PSScriptRoot).Path
$sharedLaunchDetailsPath = Join-Path $repositoryRoot 'launch-details.example.ps1'
$localLaunchDetailsPath = Join-Path $repositoryRoot 'launch-details.local.ps1'
$launchDetailsPath = if (Test-Path -LiteralPath $localLaunchDetailsPath) {
    $localLaunchDetailsPath
}
else {
    $sharedLaunchDetailsPath
}

if (-not (Test-Path -LiteralPath $launchDetailsPath)) {
    throw "Launch details were not found at '$launchDetailsPath'."
}

$launchDetails = & $launchDetailsPath
$asrDevice = [string]$launchDetails.AsrDevice
$asrComputeType = [string]$launchDetails.AsrComputeType
$ttsDevice = [string]$launchDetails.TtsDevice
$gpuCoordinationEnabled = [string]$launchDetails.GpuCoordinationEnabled

if ($asrDevice -notin @('auto', 'cpu', 'cuda')) {
    throw "AsrDevice in '$launchDetailsPath' must be auto, cpu, or cuda."
}
if ([string]::IsNullOrWhiteSpace($asrComputeType)) {
    throw "AsrComputeType in '$launchDetailsPath' cannot be empty."
}
if ($ttsDevice -notin @('auto', 'cpu', 'cuda')) {
    throw "TtsDevice in '$launchDetailsPath' must be auto, cpu, or cuda."
}
if ($gpuCoordinationEnabled -notin @('true', 'false')) {
    throw "GpuCoordinationEnabled in '$launchDetailsPath' must be true or false."
}

$runtimeDirectory = Join-Path $repositoryRoot '.runtime\production-models'
$logDirectory = Join-Path $runtimeDirectory 'logs'
$manifestPath = Join-Path $runtimeDirectory 'services.json'
$stopRequestPath = Join-Path $runtimeDirectory 'stop-requested'
$secretStorePath = Join-Path $runtimeDirectory 'secrets.json'
$tunnelTokenPath = Join-Path $runtimeDirectory 'cloudflare-tunnel-token'
$standardInputPath = Join-Path $runtimeDirectory 'empty-input.txt'
$runningProcesses = [System.Collections.Generic.List[object]]::new()

function ConvertTo-PlainText {
    param([Parameter(Mandatory)][Security.SecureString]$SecureValue)

    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureValue)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    }
}

function Protect-PrivateFile {
    param([Parameter(Mandatory)][string]$Path)

    try {
        $acl = Get-Acl -LiteralPath $Path
        $acl.SetAccessRuleProtection($true, $false)
        $identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
        $rule = [Security.AccessControl.FileSystemAccessRule]::new(
            $identity,
            [Security.AccessControl.FileSystemRights]::FullControl,
            [Security.AccessControl.AccessControlType]::Allow
        )
        $acl.SetAccessRule($rule)
        Set-Acl -LiteralPath $Path -AclObject $acl
    }
    catch {
        Remove-Item -LiteralPath $Path -Force -ErrorAction SilentlyContinue
        throw "Could not protect the private runtime file '$Path': $($_.Exception.Message)"
    }
}

function Get-CloudflareTunnelToken {
    $tokenOutput = & $CloudflaredPath tunnel token $TunnelId 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Cloudflare could not retrieve the token for tunnel $TunnelId. Confirm that the local Cloudflare login belongs to the account that owns rd-production."
    }

    $token = ($tokenOutput -join '').Trim()
    if ($token.Length -lt 64) {
        throw "Cloudflare returned an invalid token for tunnel $TunnelId."
    }

    return $token
}

function Save-SecretStore {
    Write-Host ''
    Write-Host 'Production model secrets' -ForegroundColor Cyan
    Write-Host 'Paste each value when prompted. Input remains hidden.' -ForegroundColor DarkGray

    $asrSecure = Read-Host 'ASR_SERVICE_TOKEN used in Render' -AsSecureString
    $ttsSecure = Read-Host 'TTS_SERVICE_TOKEN used in Render' -AsSecureString

    $asrToken = ConvertTo-PlainText -SecureValue $asrSecure
    $ttsToken = ConvertTo-PlainText -SecureValue $ttsSecure

    if ($asrToken.Length -lt 32) {
        throw "ASR_SERVICE_TOKEN must contain at least 32 characters; PowerShell received $($asrToken.Length)."
    }
    if ($ttsToken.Length -lt 32) {
        throw "TTS_SERVICE_TOKEN must contain at least 32 characters; PowerShell received $($ttsToken.Length)."
    }
    if ([string]::Equals($asrToken, $ttsToken, [StringComparison]::Ordinal)) {
        throw 'ASR_SERVICE_TOKEN and TTS_SERVICE_TOKEN must be different.'
    }

    Write-Host 'Retrieving the rd-production tunnel token securely...' -ForegroundColor DarkGray
    $tunnelToken = Get-CloudflareTunnelToken
    if ($tunnelToken.Length -lt 64) {
        throw 'The Cloudflare tunnel token is unexpectedly short.'
    }

    $store = [ordered]@{
        Version               = 1
        AsrServiceToken       = $asrSecure | ConvertFrom-SecureString
        TtsServiceToken       = $ttsSecure | ConvertFrom-SecureString
        CloudflareTunnelToken = (ConvertTo-SecureString $tunnelToken -AsPlainText -Force) |
            ConvertFrom-SecureString
    }
    $temporaryPath = "$secretStorePath.tmp"
    [IO.File]::WriteAllText(
        $temporaryPath,
        ($store | ConvertTo-Json),
        [Text.UTF8Encoding]::new($false)
    )
    Protect-PrivateFile -Path $temporaryPath
    Move-Item -LiteralPath $temporaryPath -Destination $secretStorePath -Force
}

function Read-SecretStore {
    if ($ResetSecrets -or -not (Test-Path -LiteralPath $secretStorePath)) {
        Save-SecretStore
    }

    try {
        $store = Get-Content -LiteralPath $secretStorePath -Raw | ConvertFrom-Json
        if ([int]$store.Version -ne 1) {
            throw 'Unsupported secret-store version.'
        }

        $asrToken = ConvertTo-PlainText -SecureValue (
            [string]$store.AsrServiceToken | ConvertTo-SecureString
        )
        $ttsToken = ConvertTo-PlainText -SecureValue (
            [string]$store.TtsServiceToken | ConvertTo-SecureString
        )
        $tunnelToken = ConvertTo-PlainText -SecureValue (
            [string]$store.CloudflareTunnelToken | ConvertTo-SecureString
        )
    }
    catch {
        throw "Could not unlock production model secrets. Run .\rs.ps1 -ResetSecrets. $($_.Exception.Message)"
    }

    if ($asrToken.Length -lt 32 -or $ttsToken.Length -lt 32 -or $tunnelToken.Length -lt 64) {
        throw 'The stored production model secrets are invalid. Run .\rs.ps1 -ResetSecrets.'
    }
    if ([string]::Equals($asrToken, $ttsToken, [StringComparison]::Ordinal)) {
        throw 'The stored ASR and TTS tokens must be different. Run .\rs.ps1 -ResetSecrets.'
    }

    return [pscustomobject]@{
        AsrServiceToken       = $asrToken
        TtsServiceToken       = $ttsToken
        CloudflareTunnelToken = $tunnelToken
    }
}

function Test-TcpPort {
    param([Parameter(Mandatory)][int]$Port)

    $client = [Net.Sockets.TcpClient]::new()
    try {
        $connection = $client.ConnectAsync('127.0.0.1', $Port)
        return $connection.Wait(250) -and $client.Connected
    }
    catch {
        return $false
    }
    finally {
        $client.Dispose()
    }
}

function Assert-PortAvailable {
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][int]$Port
    )

    if (Test-TcpPort -Port $Port) {
        throw "$Name cannot start because port $Port is already in use. Run .\rt.ps1 or stop the existing local stack."
    }
}

function Save-Manifest {
    $services = @(
        $runningProcesses | ForEach-Object {
            $_.Process.Refresh()
            [ordered]@{
                Name         = $_.Name
                ProcessId    = $_.Process.Id
                StartTimeUtc = $_.Process.StartTime.ToUniversalTime().ToString('o')
                Port         = $_.Port
            }
        }
    )
    $manifest = [ordered]@{
        Version        = 1
        RepositoryRoot = $repositoryRoot
        UpdatedAtUtc   = [DateTime]::UtcNow.ToString('o')
        Services       = $services
    }
    $temporaryPath = "$manifestPath.tmp"
    [IO.File]::WriteAllText(
        $temporaryPath,
        ($manifest | ConvertTo-Json -Depth 4),
        [Text.UTF8Encoding]::new($false)
    )
    Move-Item -LiteralPath $temporaryPath -Destination $manifestPath -Force
}

function Start-ManagedProcess {
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][string]$Executable,
        [Parameter(Mandatory)][string[]]$Arguments,
        [Parameter(Mandatory)][string]$WorkingDirectory,
        [Parameter(Mandatory)][int]$Port
    )

    if ($Port -gt 0) {
        Assert-PortAvailable -Name $Name -Port $Port
    }

    $safeName = $Name.ToLowerInvariant().Replace(' ', '-')
    $outputPath = Join-Path $logDirectory "$safeName.log"
    $errorPath = Join-Path $logDirectory "$safeName.error.log"
    $process = Start-Process `
        -FilePath $Executable `
        -ArgumentList $Arguments `
        -WorkingDirectory $WorkingDirectory `
        -RedirectStandardInput $standardInputPath `
        -RedirectStandardOutput $outputPath `
        -RedirectStandardError $errorPath `
        -WindowStyle Hidden `
        -PassThru

    $record = [pscustomobject]@{
        Name              = $Name
        Process           = $process
        Port              = $Port
        StandardErrorPath = $errorPath
    }
    $runningProcesses.Add($record)
    Save-Manifest
    return $record
}

function Wait-ForSpeechService {
    param(
        [Parameter(Mandatory)][object]$Record,
        [Parameter(Mandatory)][string]$ReadinessPath
    )

    $deadline = [DateTime]::UtcNow.AddSeconds($StartupTimeoutSeconds)
    $lastResult = 'not contacted'
    while ([DateTime]::UtcNow -lt $deadline) {
        $Record.Process.Refresh()
        if ($Record.Process.HasExited) {
            $tail = if (Test-Path -LiteralPath $Record.StandardErrorPath) {
                (Get-Content -LiteralPath $Record.StandardErrorPath -Tail 25) -join [Environment]::NewLine
            }
            else {
                'No error output was written.'
            }
            throw "$($Record.Name) exited during startup.$([Environment]::NewLine)$tail"
        }

        if (Test-TcpPort -Port $Record.Port) {
            try {
                $readiness = Invoke-RestMethod `
                    -Uri "http://127.0.0.1:$($Record.Port)$ReadinessPath" `
                    -TimeoutSec 5
                $lastResult = [string]$readiness.status
                if ($lastResult -eq 'ready') {
                    return
                }
            }
            catch {
                $lastResult = $_.Exception.Message
            }
        }

        Start-Sleep -Milliseconds 500
    }

    throw "$($Record.Name) did not become ready within $StartupTimeoutSeconds seconds. Last result: $lastResult"
}

function Stop-ProcessTree {
    param([Parameter(Mandatory)][int]$ProcessId)

    $children = Get-CimInstance Win32_Process -Filter "ParentProcessId = $ProcessId" -ErrorAction SilentlyContinue
    foreach ($child in $children) {
        Stop-ProcessTree -ProcessId $child.ProcessId
    }
    Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
}

New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null
[IO.File]::WriteAllText($standardInputPath, '', [Text.UTF8Encoding]::new($false))
Remove-Item -LiteralPath $stopRequestPath -Force -ErrorAction SilentlyContinue

Write-Host 'ReaDirect production model launcher' -ForegroundColor Green
Write-Host "Repository: $repositoryRoot"

try {
    if (Test-Path -LiteralPath $manifestPath) {
        throw 'A production model launcher manifest already exists. Run .\rt.ps1 before starting another instance.'
    }
    if (-not (Test-Path -LiteralPath $CloudflaredPath)) {
        throw "cloudflared was not found at '$CloudflaredPath'."
    }

    $asrDirectory = Join-Path $repositoryRoot 'services\asr'
    $ttsDirectory = Join-Path $repositoryRoot 'services\tts'
    $asrPython = Join-Path $asrDirectory '.venv\Scripts\python.exe'
    $ttsPython = Join-Path $ttsDirectory '.venv\Scripts\python.exe'
    foreach ($requiredPath in @($asrPython, $ttsPython)) {
        if (-not (Test-Path -LiteralPath $requiredPath)) {
            throw "Speech environment is missing: $requiredPath. Run .\scripts\bootstrap.ps1 first."
        }
    }

    $secrets = Read-SecretStore
    [IO.File]::WriteAllText(
        $tunnelTokenPath,
        $secrets.CloudflareTunnelToken,
        [Text.UTF8Encoding]::new($false)
    )
    Protect-PrivateFile -Path $tunnelTokenPath

    Write-Host ''
    Write-Host 'Starting ASR...' -ForegroundColor Cyan
    $previousAsrToken = [Environment]::GetEnvironmentVariable('ASR_SERVICE_TOKEN', 'Process')
    $previousAsrDevice = [Environment]::GetEnvironmentVariable('MU_DEVICE', 'Process')
    $previousAsrComputeType = [Environment]::GetEnvironmentVariable('MU_COMPUTE_TYPE', 'Process')
    $previousAsrGpuCoordination = [Environment]::GetEnvironmentVariable('READIRECT_GPU_COORDINATION_ENABLED', 'Process')
    try {
        [Environment]::SetEnvironmentVariable('ASR_SERVICE_TOKEN', $secrets.AsrServiceToken, 'Process')
        [Environment]::SetEnvironmentVariable('MU_DEVICE', $asrDevice, 'Process')
        [Environment]::SetEnvironmentVariable('MU_COMPUTE_TYPE', $asrComputeType, 'Process')
        [Environment]::SetEnvironmentVariable('READIRECT_GPU_COORDINATION_ENABLED', $gpuCoordinationEnabled, 'Process')
        $asr = Start-ManagedProcess `
            -Name 'ASR' `
            -Executable $asrPython `
            -Arguments @(
                '-m', 'uvicorn', 'main:app',
                '--host', '127.0.0.1',
                '--port', "$AsrPort",
                '--workers', '1',
                '--timeout-graceful-shutdown', '180'
            ) `
            -WorkingDirectory $asrDirectory `
            -Port $AsrPort
    }
    finally {
        [Environment]::SetEnvironmentVariable('ASR_SERVICE_TOKEN', $previousAsrToken, 'Process')
        [Environment]::SetEnvironmentVariable('MU_DEVICE', $previousAsrDevice, 'Process')
        [Environment]::SetEnvironmentVariable('MU_COMPUTE_TYPE', $previousAsrComputeType, 'Process')
        [Environment]::SetEnvironmentVariable('READIRECT_GPU_COORDINATION_ENABLED', $previousAsrGpuCoordination, 'Process')
    }
    Wait-ForSpeechService -Record $asr -ReadinessPath '/ready'
    Write-Host "  ASR ready on localhost:$AsrPort" -ForegroundColor Green

    Write-Host 'Starting TTS...' -ForegroundColor Cyan
    $previousTtsToken = [Environment]::GetEnvironmentVariable('TTS_SERVICE_TOKEN', 'Process')
    $previousTtsDevice = [Environment]::GetEnvironmentVariable('READIRECT_TTS_DEVICE', 'Process')
    $previousTtsGpuCoordination = [Environment]::GetEnvironmentVariable('READIRECT_GPU_COORDINATION_ENABLED', 'Process')
    try {
        [Environment]::SetEnvironmentVariable('TTS_SERVICE_TOKEN', $secrets.TtsServiceToken, 'Process')
        [Environment]::SetEnvironmentVariable('READIRECT_TTS_DEVICE', $ttsDevice, 'Process')
        [Environment]::SetEnvironmentVariable('READIRECT_GPU_COORDINATION_ENABLED', $gpuCoordinationEnabled, 'Process')
        $tts = Start-ManagedProcess `
            -Name 'TTS' `
            -Executable $ttsPython `
            -Arguments @(
                '-m', 'uvicorn', 'main:app',
                '--host', '127.0.0.1',
                '--port', "$TtsPort",
                '--workers', '1',
                '--timeout-graceful-shutdown', '180'
            ) `
            -WorkingDirectory $ttsDirectory `
            -Port $TtsPort
    }
    finally {
        [Environment]::SetEnvironmentVariable('TTS_SERVICE_TOKEN', $previousTtsToken, 'Process')
        [Environment]::SetEnvironmentVariable('READIRECT_TTS_DEVICE', $previousTtsDevice, 'Process')
        [Environment]::SetEnvironmentVariable('READIRECT_GPU_COORDINATION_ENABLED', $previousTtsGpuCoordination, 'Process')
    }
    Wait-ForSpeechService -Record $tts -ReadinessPath '/health'
    Write-Host "  TTS ready on localhost:$TtsPort" -ForegroundColor Green

    Write-Host 'Starting Cloudflare Tunnel...' -ForegroundColor Cyan
    $quotedTokenPath = '"' + $tunnelTokenPath + '"'
    $tunnel = Start-ManagedProcess `
        -Name 'Cloudflare Tunnel' `
        -Executable $CloudflaredPath `
        -Arguments @(
            'tunnel',
            '--no-autoupdate',
            '--protocol', 'http2',
            'run',
            '--token-file', $quotedTokenPath
        ) `
        -WorkingDirectory $repositoryRoot `
        -Port 0

    Start-Sleep -Seconds 5
    $tunnel.Process.Refresh()
    if ($tunnel.Process.HasExited) {
        $tail = if (Test-Path -LiteralPath $tunnel.StandardErrorPath) {
            (Get-Content -LiteralPath $tunnel.StandardErrorPath -Tail 30) -join [Environment]::NewLine
        }
        else {
            'No error output was written.'
        }
        throw "Cloudflare Tunnel exited during startup.$([Environment]::NewLine)$tail"
    }

    Write-Host '  Tunnel connector is running.' -ForegroundColor Green
    Write-Host ''
    Write-Host "Logs: $logDirectory" -ForegroundColor DarkGray
    Write-Host 'Run .\rt.ps1 from another PowerShell window to stop production models.' -ForegroundColor Cyan

    while ($true) {
        Start-Sleep -Milliseconds 500
        if (Test-Path -LiteralPath $stopRequestPath) {
            Write-Host ''
            Write-Host 'Stop requested by rt.ps1.' -ForegroundColor Cyan
            break
        }

        foreach ($record in $runningProcesses) {
            $record.Process.Refresh()
            if ($record.Process.HasExited) {
                throw "$($record.Name) stopped unexpectedly. Check $($record.StandardErrorPath)."
            }
        }
    }
}
finally {
    if ($runningProcesses.Count -gt 0) {
        Write-Host ''
        Write-Host 'Stopping production model services...' -ForegroundColor Yellow
        foreach ($record in $runningProcesses) {
            $record.Process.Refresh()
            if (-not $record.Process.HasExited) {
                Stop-ProcessTree -ProcessId $record.Process.Id
            }
        }
    }

    Remove-Item -LiteralPath $tunnelTokenPath -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $manifestPath -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath "$manifestPath.tmp" -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $stopRequestPath -Force -ErrorAction SilentlyContinue
}
