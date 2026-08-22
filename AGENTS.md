# `hotfix/playstore` Branch Rules

These instructions are mandatory whenever the current Git branch is
`hotfix/playstore`.

## Purpose

This branch exists only for local-development bug fixes that will be reviewed
before selected changes are merged into `deployment/playstore`.

## Non-negotiable deployment boundary

Never create, edit, delete, rename, or reconfigure anything related to Render
or Cloudflare from this branch. This includes, without limitation:

- `render.yaml`, Render services, environment variables, build settings,
  deployment hooks, health checks, Docker deployment configuration, and
  production service routing;
- Cloudflare Pages, Workers, tunnels, DNS records, custom domains, Pages build
  output, routing rules, credentials, tokens, and tunnel launcher settings;
- production hostnames or URLs such as `readirect.org`, `app.readirect.org`,
  `api.readirect.org`, `asr.readirect.org`, and `tts.readirect.org`;
- deployment branches, production releases, and live infrastructure state.

Do not run commands or use dashboards that mutate Render or Cloudflare while
working from this branch. If a bug appears to require a deployment or
infrastructure change, stop and report it for separate work on
`deployment/playstore`; do not make that change here.

Local application code, tests, and local-only development configuration may be
changed when needed to reproduce and fix a bug. Machine-specific launch details
must remain in the Git-ignored `launch-details.local.ps1` file and must never be
committed.
