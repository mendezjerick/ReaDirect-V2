[CmdletBinding()]
param(
    [ValidateNotNullOrEmpty()]
    [string]$ApiOrigin = 'https://staging.readirect.org',

    [switch]$SkipInstall
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repositoryRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$webRoot = Join-Path $repositoryRoot 'apps\web'
$androidRoot = Join-Path $webRoot 'android'
$apkPath = Join-Path $androidRoot 'app\build\outputs\apk\debug\app-debug.apk'
$cubismCorePath = Join-Path $webRoot 'public\assets\live2d\core\live2dcubismcore.min.js'
$packagedCubismCorePath = Join-Path $androidRoot 'app\src\main\assets\public\assets\live2d\core\live2dcubismcore.min.js'
$assertCubismCoreScript = Join-Path $PSScriptRoot 'assert-mobile-live2d-core.ps1'

function Assert-JsonApi {
    param([Parameter(Mandatory)][string]$Origin)

    $normalizedOrigin = $Origin.TrimEnd('/')
    $deadline = [DateTime]::UtcNow.AddSeconds(60)
    $lastError = 'No response was received.'

    while ([DateTime]::UtcNow -lt $deadline) {
        try {
            $response = Invoke-WebRequest `
                -Uri "$normalizedOrigin/api/experience/intro/settings" `
                -UseBasicParsing `
                -TimeoutSec 15

            if ($response.StatusCode -eq 200 -and $response.Headers['Content-Type'] -match 'application/json') {
                return $normalizedOrigin
            }

            $lastError = "HTTP $($response.StatusCode), Content-Type $($response.Headers['Content-Type'])."
        }
        catch {
            $lastError = $_.Exception.Message
        }

        Start-Sleep -Seconds 2
    }

    throw "The configured staging origin did not return the ReaDirect JSON API response within 60 seconds. Last error: $lastError"
}

function Invoke-Checked {
    param(
        [Parameter(Mandatory)][string]$FilePath,
        [Parameter(Mandatory)][string[]]$Arguments,
        [Parameter(Mandatory)][string]$WorkingDirectory
    )

    Push-Location -LiteralPath $WorkingDirectory
    try {
        & $FilePath @Arguments
        $exitCode = $LASTEXITCODE
    }
    finally {
        Pop-Location
    }

    if ($exitCode -ne 0) {
        throw "Command failed with exit code ${exitCode}: $FilePath $($Arguments -join ' ')"
    }
}

$normalizedApiOrigin = Assert-JsonApi -Origin $ApiOrigin

& $assertCubismCoreScript -SourcePath $cubismCorePath

Write-Host "Using ReaDirect staging origin: $normalizedApiOrigin" -ForegroundColor Green
Write-Host 'Building the APK with the staging origin embedded...' -ForegroundColor Cyan
$env:VITE_API_ORIGIN = $normalizedApiOrigin

Invoke-Checked `
    -FilePath 'corepack' `
    -Arguments @('pnpm', '--filter', '@readirect/web', 'build') `
    -WorkingDirectory $repositoryRoot
Invoke-Checked `
    -FilePath 'corepack' `
    -Arguments @('pnpm', '--filter', '@readirect/web', 'exec', 'cap', 'sync', 'android') `
    -WorkingDirectory $repositoryRoot
& $assertCubismCoreScript -SourcePath $cubismCorePath -PackagedPath $packagedCubismCorePath
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
Write-Host "Staging origin embedded: $normalizedApiOrigin" -ForegroundColor Green
Write-Host "APK: $apkPath" -ForegroundColor Green
