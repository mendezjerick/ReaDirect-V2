# ReaDirect Development And Staging Launcher Standard

Purpose: define the approved local and Cloudflare staging launch boundaries for
ReaDirect-V2.

This document covers developer-operated launchers only. It does not declare the
current staging setup production-ready.

## Known Recovery Baseline

The first successful complete learner-flow build is preserved by merge commit
`191d004` (`Merge pull request #21 from
mendezjerick/release/first-successful-build`). Its feature commit is `832c94b`.

These commits are recovery references, not commands to reset the repository.
Any recovery must first preserve later work, inspect migrations and PostgreSQL
state, and receive explicit owner approval before changing the active branch.

## Launcher Ownership

The repository root owns four PowerShell launchers:

| Launcher | Purpose |
|---|---|
| `start.ps1` | Start the local ReaDirect development services. |
| `stop.ps1` | Stop repository-owned local services without relying on Ctrl+C. |
| `cstart.ps1` | Start the same local services and the approved Cloudflare staging tunnel. |
| `cstop.ps1` | Stop the repository-owned staging tunnel and its local services. |

All launcher manifests, generated tunnel configuration, stop requests, and logs
belong under the Git-ignored `.runtime/` directory.

## Local Development

From the repository root:

~~~powershell
.\start.ps1
~~~

Stop the local services with:

~~~powershell
.\stop.ps1
~~~

The local launcher owns the configured web, API, ASR, TTS, and Reverb ports.
Optional services may be skipped only where `start.ps1` explicitly supports
that development state. A launcher must report a port conflict rather than
silently attaching to an unrelated process.

## Cloudflare Staging

The default staging hostname is:

~~~text
https://staging.readirect.org
~~~

Start staging in the foreground:

~~~powershell
.\cstart.ps1
~~~

Start staging without keeping the initiating terminal attached:

~~~powershell
.\cstart.ps1 -Detached
~~~

Open the site after readiness succeeds:

~~~powershell
.\cstart.ps1 -OpenBrowser
~~~

Stop staging from another PowerShell window:

~~~powershell
.\cstop.ps1
~~~

`cstart.ps1` must:

- require unoccupied repository service ports before startup;
- reuse the owner-controlled Cloudflare named-tunnel configuration and
  credentials outside the repository;
- confirm that the source tunnel configuration owns the requested hostname;
- generate a temporary repository-scoped ingress configuration under
  `.runtime/`;
- validate the generated ingress configuration before starting the tunnel;
- start the standard local launcher rather than duplicate its service logic;
- set Laravel's staging URL and disable Laravel debug output for the launched
  process;
- wait for the local services and public hostname to become ready;
- write verifiable process IDs, process start times, and logs below
  `.runtime/`; and
- reject an already-running conflicting instance of the same tunnel.

`cstop.ps1` must prefer the recorded manifest and process start times before
stopping anything. Its fallback process discovery must remain scoped to the
repository-generated tunnel configuration and known ReaDirect service ports.

## Public Network Boundary

The Cloudflare ingress exposes only the Vite web port.

~~~text
staging.readirect.org
        |
        v
Vite web server :5173
        |
        +-- /api proxy --> Laravel :8000
~~~

The tunnel configuration must never expose these ports directly:

- Laravel API `8000`;
- Mu/Nu ASR `8001`;
- Vox TTS `8002`;
- Reverb `8080`; or
- PostgreSQL `5432`.

Browser API traffic uses the Vite `/api` proxy. ASR, TTS, Reverb, PostgreSQL,
private recordings, model artifacts, and tunnel credentials remain private to
the host.

## Credentials And Generated Files

- Cloudflare credentials and the owner configuration remain outside the
  repository.
- `.runtime/cloudflare-config.yml` is generated and must not be committed.
- `.runtime/cloud-services.json`, launcher logs, and stop-request files are
  runtime state and must not be committed.
- A launcher must never print, copy into source control, or return tunnel
  credential contents.

## Staging Limitation

This staging launcher is intended for controlled tester access while the
application is still hosted from the development machine. Production
deployment requires a separate review of hardened serving, secrets,
authorization, rate limits, backups, monitoring, process supervision, TLS
boundaries, and recovery procedures.
