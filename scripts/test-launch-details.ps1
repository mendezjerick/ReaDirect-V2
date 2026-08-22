[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repositoryRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$examplePath = Join-Path $repositoryRoot 'launch-details.example.ps1'
$launcherPath = Join-Path $repositoryRoot 'rs.ps1'
$gitIgnorePath = Join-Path $repositoryRoot '.gitignore'

if (-not (Test-Path -LiteralPath $examplePath)) {
    throw 'The tracked CPU launch-details example is missing.'
}

$details = & $examplePath
if ($details.AsrDevice -ne 'cpu') {
    throw 'The shared ASR launch default must use CPU.'
}
if ($details.AsrComputeType -ne 'int8') {
    throw 'The shared CPU ASR launch default must use int8 compute.'
}
if ($details.TtsDevice -ne 'cpu') {
    throw 'The shared TTS launch default must use CPU.'
}
if ($details.GpuCoordinationEnabled -ne 'false') {
    throw 'GPU coordination must be disabled for the shared CPU launch default.'
}

$gitIgnore = Get-Content -LiteralPath $gitIgnorePath -Raw
if ($gitIgnore -notmatch '(?m)^/launch-details\.local\.ps1\r?$') {
    throw 'Machine-specific launch details must be ignored by Git.'
}

$launcher = Get-Content -LiteralPath $launcherPath -Raw
foreach ($requiredText in @(
        'launch-details.local.ps1',
        "'MU_DEVICE'",
        "'MU_COMPUTE_TYPE'",
        "'READIRECT_TTS_DEVICE'",
        "'READIRECT_GPU_COORDINATION_ENABLED'"
    )) {
    if (-not $launcher.Contains($requiredText)) {
        throw "rs.ps1 does not apply required launch setting: $requiredText"
    }
}

Write-Host 'Launch details configuration passed.' -ForegroundColor Green
