[CmdletBinding()]
param(
    [ValidateRange(1, 65535)]
    [int]$WebPort = 5174,

    [ValidateNotNullOrEmpty()]
    [string]$CloudflaredPath = 'C:\Cloudflared\bin\cloudflared.exe',

    [switch]$SkipInstall
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repositoryRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$webRoot = Join-Path $repositoryRoot 'apps\web'
$androidRoot = Join-Path $webRoot 'android'
$apkPath = Join-Path $androidRoot 'app\build\outputs\apk\debug\app-debug.apk'
$runtimeDirectory = Join-Path $repositoryRoot '.runtime'
$manifestPath = Join-Path $runtimeDirectory 'mobile-quick-tunnel.json'
$logDirectory = Join-Path $runtimeDirectory 'logs'
$stdoutPath = Join-Path $logDirectory 'mobile-quick-tunnel.log'
$stderrPath = Join-Path $logDirectory 'mobile-quick-tunnel.error.log'
$tunnelProcess = $null

function Test-TcpPort {
    param([Parameter(Mandatory)][int]$Port)

    $client = [System.Net.Sockets.TcpClient]::new()
    try {
        $connection = $client.ConnectAsync('127.0.0.1', $Port)
        return $connection.Wait(500) -and $client.Connected
    }
    catch {
        return $false
    }
    finally {
        $client.Dispose()
    }
}

function Get-CloudflaredExecutable {
    if (Test-Path -LiteralPath $CloudflaredPath) {
        return (Resolve-Path -LiteralPath $CloudflaredPath).Path
    }

    $command = Get-Command cloudflared -ErrorAction SilentlyContinue
    if ($command) {
        return $command.Source
    }

    throw "cloudflared was not found. Install it at '$CloudflaredPath' or add it to PATH."
}

function Stop-RecordedTunnel {
    if (-not (Test-Path -LiteralPath $manifestPath)) {
        return
    }

    try {
        $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
        $process = Get-Process -Id ([int]$manifest.ProcessId) -ErrorAction SilentlyContinue
        if (-not $process) {
            return
        }

        $recordedStart = [DateTime]::Parse(
            [string]$manifest.StartTimeUtc,
            [Globalization.CultureInfo]::InvariantCulture,
            [Globalization.DateTimeStyles]::RoundtripKind
        ).ToUniversalTime()

        if ([Math]::Abs(($process.StartTime.ToUniversalTime() - $recordedStart).TotalSeconds) -lt 2) {
            Stop-Process -Id $process.Id -Force
        }
    }
    catch {
        Write-Warning "The previous quick-tunnel record could not be cleaned up: $($_.Exception.Message)"
    }
    finally {
        Remove-Item -LiteralPath $manifestPath -Force -ErrorAction SilentlyContinue
    }
}

function Get-TunnelUrl {
    param([Parameter(Mandatory)][Diagnostics.Process]$Process)

    $deadline = [DateTime]::UtcNow.AddSeconds(60)
    $pattern = 'https://[a-z0-9-]+\.trycloudflare\.com'

    while ([DateTime]::UtcNow -lt $deadline) {
        $Process.Refresh()
        if ($Process.HasExited) {
            throw "cloudflared exited before creating a quick tunnel.`n$((Get-Content $stderrPath -Tail 25 -ErrorAction SilentlyContinue) -join "`n")"
        }

        $output = @(
            Get-Content -LiteralPath $stdoutPath -Raw -ErrorAction SilentlyContinue
            Get-Content -LiteralPath $stderrPath -Raw -ErrorAction SilentlyContinue
        ) -join "`n"
        $match = [regex]::Match($output, $pattern)
        if ($match.Success) {
            return $match.Value
        }

        Start-Sleep -Milliseconds 500
    }

    throw "Timed out waiting for the quick-tunnel URL.`n$((Get-Content $stderrPath -Tail 25 -ErrorAction SilentlyContinue) -join "`n")"
}

function Assert-JsonApi {
    param([Parameter(Mandatory)][string]$Origin)

    $deadline = [DateTime]::UtcNow.AddSeconds(60)
    $lastError = 'No response was received.'

    while ([DateTime]::UtcNow -lt $deadline) {
        try {
            $response = Invoke-WebRequest `
                -Uri "$Origin/api/experience/intro/settings" `
                -UseBasicParsing `
                -TimeoutSec 15

            if ($response.StatusCode -eq 200 -and $response.Headers['Content-Type'] -match 'application/json') {
                return
            }

            $lastError = "HTTP $($response.StatusCode), Content-Type $($response.Headers['Content-Type'])."
        }
        catch {
            $lastError = $_.Exception.Message
        }

        Start-Sleep -Seconds 2
    }

    throw "The tunnel did not return the ReaDirect JSON API response within 60 seconds. Last error: $lastError"
}

function Invoke-Checked {
    param(
        [Parameter(Mandatory)][string]$FilePath,
        [Parameter(Mandatory)][string[]]$Arguments,
        [Parameter(Mandatory)][string]$WorkingDirectory
    )

    & $FilePath @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed with exit code ${LASTEXITCODE}: $FilePath $($Arguments -join ' ')"
    }
}

New-Item -ItemType Directory -Force -Path $runtimeDirectory, $logDirectory | Out-Null
Remove-Item -LiteralPath $stdoutPath, $stderrPath -Force -ErrorAction SilentlyContinue

try {
    if (-not (Test-TcpPort -Port $WebPort)) {
        throw "The local web app is not listening on port $WebPort. Start ReaDirect first, then run this script again."
    }

    $cloudflared = Get-CloudflaredExecutable
    Stop-RecordedTunnel

    Write-Host 'Starting temporary Cloudflare tunnel...' -ForegroundColor Cyan
    $apiOrigin = $null
    $lastTunnelError = 'No quick-tunnel response was received.'

    for ($attempt = 1; $attempt -le 3 -and -not $apiOrigin; $attempt++) {
        Remove-Item -LiteralPath $stdoutPath, $stderrPath -Force -ErrorAction SilentlyContinue
        $tunnelProcess = $null

        try {
            $tunnelProcess = Start-Process `
                -FilePath $cloudflared `
                -ArgumentList @('tunnel', '--url', "http://127.0.0.1:$WebPort", '--no-autoupdate') `
                -WorkingDirectory $repositoryRoot `
                -RedirectStandardOutput $stdoutPath `
                -RedirectStandardError $stderrPath `
                -WindowStyle Hidden `
                -PassThru

            $candidateOrigin = Get-TunnelUrl -Process $tunnelProcess
            Assert-JsonApi -Origin $candidateOrigin
            $apiOrigin = $candidateOrigin
        }
        catch {
            $lastTunnelError = $_.Exception.Message
            if ($tunnelProcess) {
                $tunnelProcess.Refresh()
                if (-not $tunnelProcess.HasExited) {
                    Stop-Process -Id $tunnelProcess.Id -Force -ErrorAction SilentlyContinue
                }
            }

            $tunnelProcess = $null
            if ($attempt -lt 3) {
                Write-Warning "Quick tunnel attempt $attempt failed. Retrying..."
                Start-Sleep -Seconds 2
            }
        }
    }

    if (-not $apiOrigin -or -not $tunnelProcess) {
        throw "Could not create a working temporary Cloudflare tunnel after 3 attempts. Last error: $lastTunnelError"
    }

    $manifest = [ordered]@{
        Version       = 1
        RepositoryRoot = $repositoryRoot
        PublicUrl     = $apiOrigin
        ProcessId     = $tunnelProcess.Id
        StartTimeUtc  = $tunnelProcess.StartTime.ToUniversalTime().ToString('o')
        WebPort       = $WebPort
        UpdatedAtUtc  = [DateTime]::UtcNow.ToString('o')
    }
    $manifest | ConvertTo-Json | Set-Content -LiteralPath $manifestPath -Encoding UTF8

    Write-Host "API origin: $apiOrigin" -ForegroundColor Green
    Write-Host 'Building the APK with this origin embedded...' -ForegroundColor Cyan
    $env:VITE_API_ORIGIN = $apiOrigin
    Invoke-Checked `
        -FilePath 'corepack' `
        -Arguments @('pnpm', '--filter', '@readirect/web', 'build') `
        -WorkingDirectory $repositoryRoot
    Invoke-Checked `
        -FilePath 'corepack' `
        -Arguments @('pnpm', '--filter', '@readirect/web', 'exec', 'cap', 'sync', 'android') `
        -WorkingDirectory $repositoryRoot
    Invoke-Checked `
        -FilePath (Join-Path $androidRoot 'gradlew.bat') `
        -Arguments @('assembleDebug') `
        -WorkingDirectory $androidRoot

    if (-not $SkipInstall) {
        $adbDevices = @(adb devices | Where-Object { $_ -match '\tdevice$' })
        if ($adbDevices.Count -gt 0) {
            Invoke-Checked -FilePath 'adb' -Arguments @('install', '-r', $apkPath) -WorkingDirectory $repositoryRoot
            Invoke-Checked -FilePath 'adb' -Arguments @('shell', 'monkey', '-p', 'com.readirect.app', '1') -WorkingDirectory $repositoryRoot
            Write-Host 'APK installed and launched on the connected device.' -ForegroundColor Green
        }
        else {
            Write-Warning 'No connected ADB device was found. The APK was built but not installed.'
        }
    }

    Write-Host ''
    Write-Host "Temporary tunnel is running: $apiOrigin" -ForegroundColor Green
    Write-Host "APK: $apkPath" -ForegroundColor Green
    Write-Host 'Run this script again if the temporary tunnel expires.' -ForegroundColor Cyan
}
catch {
    if ($tunnelProcess) {
        $tunnelProcess.Refresh()
        if (-not $tunnelProcess.HasExited) {
            Stop-Process -Id $tunnelProcess.Id -Force -ErrorAction SilentlyContinue
        }
    }
    Remove-Item -LiteralPath $manifestPath -Force -ErrorAction SilentlyContinue
    throw
}
