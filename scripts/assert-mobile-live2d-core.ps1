[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$SourcePath,

    [string]$PackagedPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $SourcePath -PathType Leaf)) {
    throw "Cubism Core is missing at '$SourcePath'. Install the licensed runtime before building Android."
}

if ($PackagedPath -and -not (Test-Path -LiteralPath $PackagedPath -PathType Leaf)) {
    throw "The Android package omitted Cubism Core at '$PackagedPath'."
}
