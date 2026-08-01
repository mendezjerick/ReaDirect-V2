# ReaDirect V2

## Local dependency layout

ReaDirect does not reuse globally installed project libraries.

- JavaScript dependencies are managed by the root pnpm workspace.
- Laravel dependencies are installed in `apps/api/vendor` by Composer.
- ASR dependencies are installed in `services/asr/.venv` by uv.
- TTS dependencies are installed in `services/tts/.venv` by uv.
- Model weights are cached below each service's ignored `.cache` directory.
- Licensed Live2D SDK files are stored below the ignored
  `apps/web/vendor/live2d` directory.

Machine-level tools such as PHP, PostgreSQL, FFmpeg, CMake, vcpkg, Caddy,
cloudflared, WinSW, and Visual Studio Build Tools are not copied into a virtual
environment.

## Bootstrap

From PowerShell at the repository root:

```powershell
.\scripts\bootstrap.ps1
```

To also download the approved speech-model caches:

```powershell
.\scripts\bootstrap.ps1 -CacheModels
```

The global pnpm shim may require administrator access when Node is installed
under `C:\Program Files`. If `pnpm` is not available directly, use:

```powershell
corepack pnpm install --frozen-lockfile
```

## Local launcher

Start every currently configured ReaDirect service from the repository root:

```powershell
.\start.ps1
```

Stop the services without relying on the active launcher terminal:

```powershell
.\stop.ps1
```

The launcher stores verified process IDs and start times under the ignored
`.runtime` directory. The stop script uses that manifest and only falls back to
known ports when the listener can be verified as a process from this repository.

## Cloudflare staging launcher

Start the approved staging tunnel and all required local services:

```powershell
.\cstart.ps1
```

Use `.\cstart.ps1 -Detached` to run without keeping the initiating terminal
attached, or add `-OpenBrowser` to open the public site after readiness.

Stop the staging tunnel and its repository-owned local services with:

```powershell
.\cstop.ps1
```

The staging launcher exposes only the Vite web server through Cloudflare. The
API remains behind Vite's `/api` proxy, while ASR, TTS, Reverb, PostgreSQL,
recordings, models, and tunnel credentials remain private to the host. The full
rules are defined by
`READIRECT_REVAMP_DEVELOPMENT_AND_STAGING_LAUNCHER_STANDARD.md`.
Realtime limits, monitoring, and recovery are documented in
`docs/REALTIME_OPERATIONS.md`.

## Live2D Cubism SDK

The open Cubism Web Framework is downloaded from Live2D's official GitHub
repository and pinned to tag `5-r.5`.

Cubism Core is proprietary and is not published on GitHub. Download the
official Cubism SDK for Web archive after reviewing and accepting Live2D's
license, then run:

```powershell
.\scripts\setup-live2d.ps1 -SdkArchive "C:\path\to\CubismSdkForWeb.zip"
```

The setup script keeps the licensed SDK under the ignored `apps/web/vendor`
tree and synchronizes the redistributable browser Core and WebGL shaders. The
frontend automatically compiles the pinned Web Framework before development,
type checking, testing, and production builds.

Do not commit Cubism Core, private model files, learner recordings, or local
virtual environments.
