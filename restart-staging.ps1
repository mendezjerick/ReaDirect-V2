[CmdletBinding()]
param(
    [ValidateNotNullOrEmpty()]
    [string]$PublicUrl = 'https://staging.readirect.org',

    [ValidateRange(30, 600)]
    [int]$TimeoutSeconds = 300
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repositoryRoot = (Resolve-Path -LiteralPath $PSScriptRoot).Path
$stopScript = Join-Path $repositoryRoot 'cstop.ps1'
$startScript = Join-Path $repositoryRoot 'cstart.ps1'
$viteConfig = Join-Path $repositoryRoot 'apps/web/vite.config.ts'

if (-not (Test-Path -LiteralPath $stopScript) -or -not (Test-Path -LiteralPath $startScript)) {
    throw "This script must be run from the ReaDirect-V2 repository root."
}

if (-not (Test-Path -LiteralPath $viteConfig)) {
    throw "Vite configuration was not found at $viteConfig."
}

$viteConfigText = Get-Content -LiteralPath $viteConfig -Raw
if ($viteConfigText -notmatch '(?s)cors\s*:\s*\{.*?credentials\s*:\s*true') {
    throw "Vite credentialed CORS is not enabled in apps/web/vite.config.ts. Restore that setting before restarting staging."
}

Write-Host 'ReaDirect staging recovery' -ForegroundColor Cyan
Write-Host "Repository: $repositoryRoot"
Write-Host "Public URL: $PublicUrl"
Write-Host ''

Write-Host 'Stopping the current cloud session...' -ForegroundColor Yellow
try {
    & $stopScript
}
catch {
    throw "cstop.ps1 failed: $($_.Exception.Message)"
}

Write-Host 'Starting cloud mode in the background...' -ForegroundColor Yellow
try {
    & $startScript -Detached
}
catch {
    throw "cstart.ps1 failed: $($_.Exception.Message)"
}

$deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
$apiUrl = "$($PublicUrl.TrimEnd('/'))/api/experience/intro/settings"
$preflightHeaders = @{
    Origin = 'https://localhost'
    'Access-Control-Request-Method' = 'POST'
    'Access-Control-Request-Headers' = 'accept,content-type'
}

while ([DateTime]::UtcNow -lt $deadline) {
    try {
        $apiResponse = Invoke-WebRequest `
            -Uri $apiUrl `
            -Headers @{ Accept = 'application/json'; Origin = 'https://localhost' } `
            -TimeoutSec 15

        $preflightResponse = Invoke-WebRequest `
            -Uri "$($PublicUrl.TrimEnd('/'))/api/learners/login" `
            -Method Options `
            -Headers $preflightHeaders `
            -TimeoutSec 15

        $allowCredentials = [string]$preflightResponse.Headers['Access-Control-Allow-Credentials']
        $allowOrigin = [string]$preflightResponse.Headers['Access-Control-Allow-Origin']

        if (
            $apiResponse.StatusCode -eq 200 -and
            $allowCredentials -eq 'true' -and
            $allowOrigin -eq 'https://localhost'
        ) {
            Write-Host ''
            Write-Host 'Staging is ready.' -ForegroundColor Green
            Write-Host 'Credentialed Android CORS preflight passed.' -ForegroundColor Green
            Write-Host "Test URL: $PublicUrl"
            exit 0
        }
    }
    catch {
        # Cloud startup and the CPU TTS model can take a few minutes.
    }

    Start-Sleep -Seconds 2
}

throw "Staging did not become ready within $TimeoutSeconds seconds. Check .runtime/logs/cstart-host.log and .runtime/logs/cloudflare-tunnel.error.log."
