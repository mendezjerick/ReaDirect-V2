[CmdletBinding()]
param(
    [switch]$CacheModels,
    [string]$Live2DSdkArchive
)

$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path -Parent $PSScriptRoot

Push-Location $repositoryRoot
try {
    corepack pnpm install --frozen-lockfile
    composer install --working-dir apps/api --no-interaction --no-scripts
    python -m uv sync --project services/asr --python 3.11 --locked
    python -m uv sync --project services/tts --python 3.11 --locked

    & (Join-Path $PSScriptRoot 'setup-live2d.ps1') -SdkArchive $Live2DSdkArchive

    if ($CacheModels) {
        & services/asr/.venv/Scripts/python.exe services/asr/scripts/cache-models.py
        & services/tts/.venv/Scripts/python.exe services/tts/scripts/cache-models.py
    }
}
finally {
    Pop-Location
}
