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

    [ValidateRange(30, 600)]
    [int]$SpeechStartupTimeoutSeconds = 240,

    [switch]$ProductionSpeechServices,

    [switch]$OpenBrowser
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repositoryRoot = $PSScriptRoot
$runtimeDirectory = Join-Path $repositoryRoot '.runtime'
$logDirectory = Join-Path $runtimeDirectory 'logs'
$serviceManifestPath = Join-Path $runtimeDirectory 'services.json'
$stopRequestPath = Join-Path $runtimeDirectory 'stop-requested'
$bindAddress = '0.0.0.0'
$runningProcesses = [System.Collections.Generic.List[object]]::new()
$serviceResults = [System.Collections.Generic.List[object]]::new()
$previousReverbPort = [Environment]::GetEnvironmentVariable('REVERB_PORT', 'Process')
$previousReverbServerPort = [Environment]::GetEnvironmentVariable('REVERB_SERVER_PORT', 'Process')

function Write-Section {
    param([Parameter(Mandatory)][string]$Title)

    Write-Host ''
    Write-Host $Title -ForegroundColor Cyan
}

function Get-RequiredCommandPath {
    param(
        [Parameter(Mandatory)][string]$Command,
        [Parameter(Mandatory)][string]$InstallHint
    )

    $resolvedCommand = Get-Command $Command -ErrorAction SilentlyContinue

    if (-not $resolvedCommand) {
        throw "Required command '$Command' was not found. $InstallHint"
    }

    return $resolvedCommand.Source
}

function Test-TcpPort {
    param([Parameter(Mandatory)][int]$Port)

    $client = [System.Net.Sockets.TcpClient]::new()

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
        [Parameter(Mandatory)][string]$ServiceName,
        [Parameter(Mandatory)][int]$Port
    )

    if (Test-TcpPort -Port $Port) {
        throw "$ServiceName cannot start because port $Port is already in use. Choose another port when running start.ps1."
    }
}

function Add-SkippedService {
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][string]$Reason
    )

    $serviceResults.Add([pscustomobject]@{
            Name   = $Name
            State  = 'Skipped'
            Url    = $null
            Reason = $Reason
        })
}

function Save-ServiceManifest {
    $services = @(
        $runningProcesses | ForEach-Object {
            $_.Process.Refresh()

            [ordered]@{
                Name         = $_.Name
                ProcessId    = $_.Process.Id
                StartTimeUtc = $_.Process.StartTime.ToUniversalTime().ToString('o')
                Port         = $_.Port
                Url          = $_.Url
            }
        }
    )

    $manifest = [ordered]@{
        Version        = 1
        RepositoryRoot = $repositoryRoot
        UpdatedAtUtc   = [DateTime]::UtcNow.ToString('o')
        Services       = $services
    }

    $temporaryManifestPath = "$serviceManifestPath.tmp"
    $manifest | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $temporaryManifestPath -Encoding UTF8
    Move-Item -LiteralPath $temporaryManifestPath -Destination $serviceManifestPath -Force
}

function Start-ManagedProcess {
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][string]$Executable,
        [Parameter(Mandatory)][string[]]$Arguments,
        [Parameter(Mandatory)][string]$WorkingDirectory,
        [Parameter(Mandatory)][int]$Port,
        [Parameter(Mandatory)][string]$Url
    )

    Assert-PortAvailable -ServiceName $Name -Port $Port

    $safeName = $Name.ToLowerInvariant().Replace(' ', '-')
    $standardOutputPath = Join-Path $logDirectory "$safeName.log"
    $standardErrorPath = Join-Path $logDirectory "$safeName.error.log"

    $process = Start-Process `
        -FilePath $Executable `
        -ArgumentList $Arguments `
        -WorkingDirectory $WorkingDirectory `
        -RedirectStandardOutput $standardOutputPath `
        -RedirectStandardError $standardErrorPath `
        -WindowStyle Hidden `
        -PassThru

    $processRecord = [pscustomobject]@{
        Name               = $Name
        Process            = $process
        Port               = $Port
        Url                = $Url
        StandardOutputPath = $standardOutputPath
        StandardErrorPath  = $standardErrorPath
    }

    $runningProcesses.Add($processRecord)
    Save-ServiceManifest
    return $processRecord
}

function Start-ManagedBackgroundProcess {
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][string]$Executable,
        [Parameter(Mandatory)][string[]]$Arguments,
        [Parameter(Mandatory)][string]$WorkingDirectory
    )

    $safeName = $Name.ToLowerInvariant().Replace(' ', '-')
    $standardOutputPath = Join-Path $logDirectory "$safeName.log"
    $standardErrorPath = Join-Path $logDirectory "$safeName.error.log"
    $process = Start-Process `
        -FilePath $Executable `
        -ArgumentList $Arguments `
        -WorkingDirectory $WorkingDirectory `
        -RedirectStandardOutput $standardOutputPath `
        -RedirectStandardError $standardErrorPath `
        -WindowStyle Hidden `
        -PassThru

    $processRecord = [pscustomobject]@{
        Name               = $Name
        Process            = $process
        Port               = 0
        Url                = $null
        StandardOutputPath = $standardOutputPath
        StandardErrorPath  = $standardErrorPath
    }
    $runningProcesses.Add($processRecord)
    Save-ServiceManifest

    Start-Sleep -Milliseconds 750
    $process.Refresh()
    if ($process.HasExited) {
        $errorTail = if (Test-Path -LiteralPath $standardErrorPath) {
            (Get-Content -LiteralPath $standardErrorPath -Tail 20) -join [Environment]::NewLine
        }
        else {
            'No error output was written.'
        }
        throw "$Name exited during startup.$([Environment]::NewLine)$errorTail"
    }

    $serviceResults.Add([pscustomobject]@{
            Name   = $Name
            State  = 'Running'
            Url    = $null
            Reason = $null
        })
    return $processRecord
}

function Wait-ForService {
    param(
        [Parameter(Mandatory)][object]$ProcessRecord,
        [int]$TimeoutSeconds = 30,
        [string]$ReadinessPath = ''
    )

    $deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
    $lastReadinessError = $null

    while ([DateTime]::UtcNow -lt $deadline) {
        $ProcessRecord.Process.Refresh()

        if ($ProcessRecord.Process.HasExited) {
            $errorTail = if (Test-Path -LiteralPath $ProcessRecord.StandardErrorPath) {
                (Get-Content -LiteralPath $ProcessRecord.StandardErrorPath -Tail 20) -join [Environment]::NewLine
            }
            else {
                'No error output was written.'
            }

            throw "$($ProcessRecord.Name) exited before becoming ready.$([Environment]::NewLine)$errorTail"
        }

        $serviceReady = Test-TcpPort -Port $ProcessRecord.Port

        if ($serviceReady -and -not [string]::IsNullOrWhiteSpace($ReadinessPath)) {
            try {
                $readiness = Invoke-RestMethod `
                    -Uri "http://127.0.0.1:$($ProcessRecord.Port)$ReadinessPath" `
                    -TimeoutSec 5
                $serviceReady = $readiness.status -eq 'ready'
                if (-not $serviceReady) {
                    $lastReadinessError = "reported status '$($readiness.status)'"
                }
            }
            catch {
                $serviceReady = $false
                $lastReadinessError = $_.Exception.Message
            }
        }

        if ($serviceReady) {
            $serviceResults.Add([pscustomobject]@{
                    Name   = $ProcessRecord.Name
                    State  = 'Running'
                    Url    = $ProcessRecord.Url
                    Reason = $null
                })
            return
        }

        Start-Sleep -Milliseconds 250
    }

    $readinessDetail = if ($lastReadinessError) {
        " Last readiness result: $lastReadinessError."
    }
    else {
        ''
    }
    throw "$($ProcessRecord.Name) did not become ready on port $($ProcessRecord.Port) within $TimeoutSeconds seconds.$readinessDetail Check $($ProcessRecord.StandardErrorPath)."
}

function Stop-ProcessTree {
    param([Parameter(Mandatory)][int]$ProcessId)

    $childProcesses = Get-CimInstance Win32_Process -Filter "ParentProcessId = $ProcessId" -ErrorAction SilentlyContinue

    foreach ($childProcess in $childProcesses) {
        Stop-ProcessTree -ProcessId $childProcess.ProcessId
    }

    Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
}

function Get-LanAddresses {
    try {
        return Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
            Where-Object {
                $_.IPAddress -ne '127.0.0.1' -and
                $_.IPAddress -notlike '169.254.*' -and
                $_.AddressState -eq 'Preferred'
            } |
            Select-Object -ExpandProperty IPAddress -Unique
    }
    catch {
        return @()
    }
}

New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null
Remove-Item -LiteralPath $stopRequestPath -Force -ErrorAction SilentlyContinue

Write-Host 'ReaDirect local launcher' -ForegroundColor Green
Write-Host "Repository: $repositoryRoot"

try {
    [Environment]::SetEnvironmentVariable('REVERB_PORT', [string]$ReverbPort, 'Process')
    [Environment]::SetEnvironmentVariable('REVERB_SERVER_PORT', [string]$ReverbPort, 'Process')

    $corepackPath = Get-RequiredCommandPath `
        -Command 'corepack' `
        -InstallHint 'Install the Node.js version declared by this repository.'

    $viteBinary = Join-Path $repositoryRoot 'apps\web\node_modules\.bin\vite.cmd'
    if (-not (Test-Path -LiteralPath $viteBinary)) {
        throw 'Frontend dependencies are missing. Run .\scripts\bootstrap.ps1 once, then retry .\start.ps1.'
    }

    Write-Section -Title 'Starting services'

    $webProcess = Start-ManagedProcess `
        -Name 'Web' `
        -Executable $corepackPath `
        -Arguments @('pnpm', '--filter', '@readirect/web', 'dev', '--host', $bindAddress, '--port', "$WebPort", '--strictPort') `
        -WorkingDirectory $repositoryRoot `
        -Port $WebPort `
        -Url "http://localhost:$WebPort"
    Wait-ForService -ProcessRecord $webProcess
    Write-Host "  Web       ready on port $WebPort" -ForegroundColor Green

    $artisanPath = Join-Path $repositoryRoot 'apps\api\artisan'
    $laravelBootstrapPath = Join-Path $repositoryRoot 'apps\api\bootstrap\app.php'

    if ((Test-Path -LiteralPath $laravelBootstrapPath) -and (Get-Item -LiteralPath $artisanPath).Length -gt 1) {
        $phpPath = Get-RequiredCommandPath -Command 'php' -InstallHint 'Install PHP 8.3 or newer.'
        $apiProcess = Start-ManagedProcess `
            -Name 'API' `
            -Executable $phpPath `
            -Arguments @('artisan', 'serve', '--host', $bindAddress, '--port', "$ApiPort") `
            -WorkingDirectory (Join-Path $repositoryRoot 'apps\api') `
            -Port $ApiPort `
            -Url "http://localhost:$ApiPort"
        Wait-ForService -ProcessRecord $apiProcess
        Write-Host "  API       ready on port $ApiPort" -ForegroundColor Green

        $reverbConfigPath = Join-Path $repositoryRoot 'apps\api\config\reverb.php'
        if (Test-Path -LiteralPath $reverbConfigPath) {
            $reverbProcess = Start-ManagedProcess `
                -Name 'Reverb' `
                -Executable $phpPath `
                -Arguments @('artisan', 'reverb:start', '--host', $bindAddress, '--port', "$ReverbPort") `
                -WorkingDirectory (Join-Path $repositoryRoot 'apps\api') `
                -Port $ReverbPort `
                -Url "ws://localhost:$ReverbPort"
            Wait-ForService -ProcessRecord $reverbProcess
            Write-Host "  Reverb    ready on port $ReverbPort" -ForegroundColor Green

            & $phpPath $artisanPath queue:prune-failed --hours=168 | Out-Null
            if ($LASTEXITCODE -ne 0) {
                throw 'Failed to prune expired broadcast queue failures.'
            }

            $queueProcess = Start-ManagedBackgroundProcess `
                -Name 'Broadcast Queue' `
                -Executable $phpPath `
                -Arguments @(
                    'artisan', 'queue:work', 'database',
                    '--queue=broadcasts',
                    '--sleep=1',
                    '--tries=3',
                    '--timeout=30',
                    '--backoff=2',
                    '--memory=256'
                ) `
                -WorkingDirectory (Join-Path $repositoryRoot 'apps\api')
            Write-Host '  Queue     broadcast worker ready' -ForegroundColor Green
        }
        else {
            Add-SkippedService -Name 'Reverb' -Reason 'Laravel Reverb has not been configured yet.'
            Add-SkippedService -Name 'Broadcast Queue' -Reason 'Laravel Reverb has not been configured yet.'
        }
    }
    else {
        Add-SkippedService -Name 'API' -Reason 'Laravel is still an empty scaffold.'
        Add-SkippedService -Name 'Reverb' -Reason 'Laravel is still an empty scaffold.'
        Add-SkippedService -Name 'Broadcast Queue' -Reason 'Laravel is still an empty scaffold.'
    }

    $speechServices = @(
        @{
            Name       = 'ASR'
            Directory  = Join-Path $repositoryRoot 'services\asr'
            Port       = $AsrPort
            Url        = "http://localhost:$AsrPort"
            ReadinessPath = '/ready'
        },
        @{
            Name       = 'TTS'
            Directory  = Join-Path $repositoryRoot 'services\tts'
            Port       = $TtsPort
            Url        = "http://localhost:$TtsPort"
            ReadinessPath = '/health'
        }
    )

    foreach ($speechService in $speechServices) {
        $entrypointPath = Join-Path $speechService.Directory 'main.py'
        $pythonPath = Join-Path $speechService.Directory '.venv\Scripts\python.exe'
        $entrypointSource = if (Test-Path -LiteralPath $entrypointPath) {
            Get-Content -LiteralPath $entrypointPath -Raw
        }
        else {
            ''
        }

        if ([string]::IsNullOrWhiteSpace($entrypointSource)) {
            Add-SkippedService -Name $speechService.Name -Reason 'The FastAPI entrypoint is still empty.'
            continue
        }

        if (-not (Test-Path -LiteralPath $pythonPath)) {
            throw "$($speechService.Name) environment is missing. Run .\scripts\bootstrap.ps1 once, then retry."
        }

        $speechArguments = @(
            '-m', 'uvicorn', 'main:app',
            '--host', $bindAddress,
            '--port', "$($speechService.Port)",
            '--timeout-graceful-shutdown', '180'
        )
        if ($ProductionSpeechServices) {
            $speechArguments += @('--workers', '1')
        }
        else {
            $speechArguments += '--reload'
        }

        $speechProcess = Start-ManagedProcess `
            -Name $speechService.Name `
            -Executable $pythonPath `
            -Arguments $speechArguments `
            -WorkingDirectory $speechService.Directory `
            -Port $speechService.Port `
            -Url $speechService.Url
        Wait-ForService `
            -ProcessRecord $speechProcess `
            -TimeoutSeconds $SpeechStartupTimeoutSeconds `
            -ReadinessPath $speechService.ReadinessPath
        Write-Host "  $($speechService.Name.PadRight(9))ready on port $($speechService.Port)" -ForegroundColor Green
    }

    Write-Section -Title 'Local URLs'
    foreach ($service in $serviceResults) {
        if ($service.State -eq 'Running' -and $service.Url) {
            Write-Host "  $($service.Name.PadRight(10))$($service.Url)" -ForegroundColor White
        }
        elseif ($service.State -eq 'Running') {
            Write-Host "  $($service.Name.PadRight(16))running in background" -ForegroundColor White
        }
        else {
            Write-Host "  $($service.Name.PadRight(16))not started - $($service.Reason)" -ForegroundColor DarkYellow
        }
    }

    $lanAddresses = @(Get-LanAddresses)
    if ($lanAddresses.Count -gt 0) {
        Write-Section -Title 'Mobile / LAN URLs'
        foreach ($lanAddress in $lanAddresses) {
            Write-Host "  Web       http://${lanAddress}:$WebPort"
            if ($serviceResults.Name -contains 'API' -and ($serviceResults | Where-Object Name -eq 'API').State -eq 'Running') {
                Write-Host "  API       http://${lanAddress}:$ApiPort"
            }
        }
    }

    Write-Host ''
    Write-Host "Logs: $logDirectory" -ForegroundColor DarkGray
    Write-Host 'Press Ctrl+C to stop every service.' -ForegroundColor Cyan

    if ($OpenBrowser) {
        Start-Process "http://localhost:$WebPort"
    }

    while ($true) {
        Start-Sleep -Seconds 1

        if (Test-Path -LiteralPath $stopRequestPath) {
            Write-Host ''
            Write-Host 'Stop requested by stop.ps1.' -ForegroundColor Cyan
            break
        }

        foreach ($processRecord in $runningProcesses) {
            $processRecord.Process.Refresh()
            if ($processRecord.Process.HasExited) {
                throw "$($processRecord.Name) stopped unexpectedly. Check $($processRecord.StandardErrorPath)."
            }
        }
    }
}
finally {
    if ($runningProcesses.Count -gt 0) {
        Write-Host ''
        Write-Host 'Stopping ReaDirect services...' -ForegroundColor Yellow

        foreach ($processRecord in $runningProcesses) {
            if (-not $processRecord.Process.HasExited) {
                Stop-ProcessTree -ProcessId $processRecord.Process.Id
            }
        }
    }

    Remove-Item -LiteralPath $serviceManifestPath -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $stopRequestPath -Force -ErrorAction SilentlyContinue
    [Environment]::SetEnvironmentVariable('REVERB_PORT', $previousReverbPort, 'Process')
    [Environment]::SetEnvironmentVariable('REVERB_SERVER_PORT', $previousReverbServerPort, 'Process')
}
