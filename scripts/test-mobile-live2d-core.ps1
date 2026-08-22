[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$assertScript = Join-Path $PSScriptRoot 'assert-mobile-live2d-core.ps1'
$testRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("readirect-live2d-test-" + [Guid]::NewGuid().ToString('N'))
$sourcePath = Join-Path $testRoot 'public\assets\live2d\core\live2dcubismcore.min.js'
$packagedPath = Join-Path $testRoot 'android\assets\public\assets\live2d\core\live2dcubismcore.min.js'

try {
    New-Item -ItemType Directory -Path (Split-Path -Parent $sourcePath) -Force | Out-Null

    $missingSourceFailed = $false
    try {
        & $assertScript -SourcePath $sourcePath
    }
    catch {
        $missingSourceFailed = $_.Exception.Message -match 'Cubism Core'
    }

    if (-not $missingSourceFailed) {
        throw 'The preflight must reject a build when Cubism Core is missing.'
    }

    Set-Content -LiteralPath $sourcePath -Value 'licensed-runtime-fixture'
    & $assertScript -SourcePath $sourcePath

    $missingPackageFailed = $false
    try {
        & $assertScript -SourcePath $sourcePath -PackagedPath $packagedPath
    }
    catch {
        $missingPackageFailed = $_.Exception.Message -match 'Android package'
    }

    if (-not $missingPackageFailed) {
        throw 'The post-sync check must reject a package that omitted Cubism Core.'
    }

    New-Item -ItemType Directory -Path (Split-Path -Parent $packagedPath) -Force | Out-Null
    Copy-Item -LiteralPath $sourcePath -Destination $packagedPath
    & $assertScript -SourcePath $sourcePath -PackagedPath $packagedPath

    Write-Host 'Mobile Cubism Core preflight checks passed.' -ForegroundColor Green
}
finally {
    if (Test-Path -LiteralPath $testRoot) {
        Remove-Item -LiteralPath $testRoot -Recurse -Force
    }
}
