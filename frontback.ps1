[CmdletBinding()]
param(
    [ValidateRange(1, 65535)]
    [int]$WebPort = 5174,

    [ValidateRange(1, 65535)]
    [int]$ApiPort = 8000
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repositoryRoot = (Resolve-Path -LiteralPath $PSScriptRoot).Path
$runtimeDirectory = Join-Path $repositoryRoot '.runtime'
$logDirectory = Join-Path $runtimeDirectory 'logs'
$runningProcesses = [System.Collections.Generic.List[object]]::new()

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
        throw "$ServiceName cannot start because port $Port is already in use."
    }
}

function Start-ManagedProcess {
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][string]$Executable,
        [Parameter(Mandatory)][string[]]$Arguments,
        [Parameter(Mandatory)][string]$WorkingDirectory,
        [Parameter(Mandatory)][int]$Port
    )

    Assert-PortAvailable -ServiceName $Name -Port $Port

    $safeName = $Name.ToLowerInvariant()
    $standardOutputPath = Join-Path $logDirectory "frontback-$safeName.log"
    $standardErrorPath = Join-Path $logDirectory "frontback-$safeName.error.log"

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
        StandardOutputPath = $standardOutputPath
        StandardErrorPath  = $standardErrorPath
    }

    $runningProcesses.Add($processRecord)
    return $processRecord
}

function Wait-ForService {
    param(
        [Parameter(Mandatory)][object]$ProcessRecord,
        [ValidateRange(1, 300)]
        [int]$TimeoutSeconds = 60
    )

    $deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)

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

        if (Test-TcpPort -Port $ProcessRecord.Port) {
            return
        }

        Start-Sleep -Milliseconds 250
    }

    throw "$($ProcessRecord.Name) did not become ready on port $($ProcessRecord.Port) within $TimeoutSeconds seconds. Check $($ProcessRecord.StandardErrorPath)."
}

function Stop-ProcessTree {
    param([Parameter(Mandatory)][int]$ProcessId)

    $childProcesses = Get-CimInstance Win32_Process `
        -Filter "ParentProcessId = $ProcessId" `
        -ErrorAction SilentlyContinue

    foreach ($childProcess in $childProcesses) {
        Stop-ProcessTree -ProcessId ([int]$childProcess.ProcessId)
    }

    Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
}

New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null

$webProcess = $null
$apiProcess = $null

try {
    $corepackPath = Get-RequiredCommandPath `
        -Command 'corepack' `
        -InstallHint 'Install the Node.js version declared by this repository.'
    $phpPath = Get-RequiredCommandPath `
        -Command 'php' `
        -InstallHint 'Install PHP 8.3 or newer.'

    $viteBinary = Join-Path $repositoryRoot 'apps\web\node_modules\.bin\vite.cmd'
    if (-not (Test-Path -LiteralPath $viteBinary)) {
        throw 'Frontend dependencies are missing. Run .\scripts\bootstrap.ps1 once, then retry .\frontback.ps1.'
    }

    $artisanPath = Join-Path $repositoryRoot 'apps\api\artisan'
    $laravelBootstrapPath = Join-Path $repositoryRoot 'apps\api\bootstrap\app.php'
    if (-not (Test-Path -LiteralPath $laravelBootstrapPath) -or
        -not (Test-Path -LiteralPath $artisanPath) -or
        (Get-Item -LiteralPath $artisanPath).Length -le 1) {
        throw 'The Laravel API scaffold is missing or incomplete.'
    }

    Write-Host 'ReaDirect frontend and backend launcher' -ForegroundColor Green
    Write-Host "Frontend: http://localhost:$WebPort"
    Write-Host "Backend:  http://localhost:$ApiPort"
    Write-Host ''

    $webProcess = Start-ManagedProcess `
        -Name 'Web' `
        -Executable $corepackPath `
        -Arguments @(
            'pnpm', '--filter', '@readirect/web', 'dev',
            '--host', '127.0.0.1',
            '--port', "$WebPort",
            '--strictPort'
        ) `
        -WorkingDirectory $repositoryRoot `
        -Port $WebPort
    Wait-ForService -ProcessRecord $webProcess
    Write-Host "Web: ready on port $WebPort" -ForegroundColor Green

    $apiProcess = Start-ManagedProcess `
        -Name 'API' `
        -Executable $phpPath `
        -Arguments @(
            'artisan', 'serve',
            '--host', '127.0.0.1',
            '--port', "$ApiPort"
        ) `
        -WorkingDirectory (Join-Path $repositoryRoot 'apps\api') `
        -Port $ApiPort
    Wait-ForService -ProcessRecord $apiProcess
    Write-Host "API: ready on port $ApiPort" -ForegroundColor Green

    Write-Host ''
    Write-Host "Logs: $logDirectory" -ForegroundColor DarkGray
    Write-Host 'Press Ctrl+C to stop the frontend and backend.' -ForegroundColor Cyan

    while ($true) {
        Start-Sleep -Seconds 1
    }
}
finally {
    foreach ($processRecord in @($runningProcesses | Sort-Object -Property Name -Descending)) {
        $processRecord.Process.Refresh()
        if (-not $processRecord.Process.HasExited) {
            Stop-ProcessTree -ProcessId $processRecord.Process.Id
        }
    }
}
