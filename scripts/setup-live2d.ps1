[CmdletBinding()]
param(
    [string]$SdkArchive
)

$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path -Parent $PSScriptRoot
$vendorRoot = Join-Path $repositoryRoot 'apps/web/vendor/live2d'
$frameworkDirectory = Join-Path $vendorRoot 'CubismWebFramework'
$coreTarget = Join-Path $vendorRoot 'Core'
$legacyCoreTarget = Join-Path $vendorRoot 'CubismCore'
$frameworkTag = '5-r.5'
$frameworkRepository = 'https://github.com/Live2D/CubismWebFramework.git'

New-Item -ItemType Directory -Force -Path $vendorRoot | Out-Null

if (-not (Test-Path -LiteralPath $frameworkDirectory -PathType Container)) {
    git clone --depth 1 --branch $frameworkTag $frameworkRepository $frameworkDirectory
}

if ((Test-Path -LiteralPath $legacyCoreTarget) -and -not (Test-Path -LiteralPath $coreTarget)) {
    Move-Item -LiteralPath $legacyCoreTarget -Destination $coreTarget
}

if ($SdkArchive -and -not (Test-Path -LiteralPath $coreTarget)) {
    $resolvedArchive = (Resolve-Path -LiteralPath $SdkArchive).Path
    if ([IO.Path]::GetExtension($resolvedArchive) -ne '.zip') {
        throw 'The Cubism SDK archive must be an official .zip distribution.'
    }

    $temporaryRoot = Join-Path ([IO.Path]::GetTempPath()) ("readirect-live2d-" + [guid]::NewGuid())
    New-Item -ItemType Directory -Path $temporaryRoot | Out-Null

    try {
        Expand-Archive -LiteralPath $resolvedArchive -DestinationPath $temporaryRoot
        $coreFile = Get-ChildItem -LiteralPath $temporaryRoot -Recurse -File |
            Where-Object { $_.Name -in @('live2dcubismcore.min.js', 'live2dcubismcore.js') } |
            Select-Object -First 1

        if (-not $coreFile) {
            throw 'The archive does not contain Cubism Core for Web.'
        }

        Copy-Item -LiteralPath $coreFile.Directory.FullName -Destination $coreTarget -Recurse
        Write-Host "Cubism Core was installed at $coreTarget"
    }
    finally {
        if (Test-Path -LiteralPath $temporaryRoot) {
            Remove-Item -LiteralPath $temporaryRoot -Recurse -Force
        }
    }
}

if (-not (Test-Path -LiteralPath $coreTarget)) {
    Write-Host 'Cubism Web Framework is ready.'
    Write-Host 'Cubism Core was not installed because no licensed SDK archive was supplied.'
    exit 0
}

$publicLive2DRoot = Join-Path $repositoryRoot 'apps/web/public/assets/live2d'
$publicCoreRoot = Join-Path $publicLive2DRoot 'core'
$publicShaderRoot = Join-Path $publicLive2DRoot 'shaders'
$frameworkShaderRoot = Join-Path $frameworkDirectory 'Shaders/WebGL'

New-Item -ItemType Directory -Force -Path $publicCoreRoot | Out-Null
New-Item -ItemType Directory -Force -Path $publicShaderRoot | Out-Null

Copy-Item `
    -LiteralPath (Join-Path $coreTarget 'live2dcubismcore.min.js') `
    -Destination (Join-Path $publicCoreRoot 'live2dcubismcore.min.js') `
    -Force

Copy-Item `
    -Path (Join-Path $frameworkShaderRoot '*') `
    -Destination $publicShaderRoot `
    -Recurse `
    -Force

Write-Host 'Cubism Web Framework and Core are ready.'
Write-Host "Browser runtime files were synchronized to $publicLive2DRoot"
