# ReaDirect Revamp Technology Stack

This file defines the approved technology stack for ReaDirect. Only the technologies listed below may be used. Any addition, replacement, or substitution requires explicit approval from the project owners.

## Platform

- Windows x64
- PowerShell
- Windows Task Scheduler
- WinSW

## Frontend

- React
- TypeScript
- Vite
- React Router
- Tailwind CSS Core
- Motion for React
- XState
- TanStack Query
- React Hook Form
- Zod
- KAPLAY
- PixiJS
- Laravel Echo
- pusher-js
- vite-plugin-pwa
- Workbox
- Web Audio API
- MediaDevices API
- AudioWorklet API
- WebSocket API
- WebGL API
- Canvas API
- IndexedDB API
- Service Worker API
- Web App Manifest
- SVG

## Game Development

- React is mandatory for every game route, menu, and host boundary.
- Each game must use exactly one approved combination:
  - React plus KAPLAY
  - React plus PixiJS
- KAPLAY and PixiJS must not power the same main gameplay canvas.
- Phaser is prohibited and must never be installed, imported, bundled, copied,
  or loaded from a CDN.
- Games are portrait-only, touch-first, single-player 2D modules within the
  existing React application.
- Tiled Map Editor is optional for tile-based game asset production.
- A bounded top-down educational RPG is the maximum approved game scope.

The complete dependency, lifecycle, input, asset, backend, and scope rules are
defined in READIRECT_REVAMP_GAME_TECH_STACK.md.

## Character Runtime

- Live2D Cubism SDK for Web
- Live2D Cubism Core
- Live2D Cubism Web Framework
- Live2D Cubism runtime model files
- PNG texture atlases

## Backend

- PHP
- Laravel
- Laravel Sanctum
- Laravel Octane
- RoadRunner
- Laravel Reverb
- Laravel Scheduler
- Laravel Database Queue
- Laravel Database Cache
- Laravel Local Private Filesystem
- Composer

## Database

- PostgreSQL
- pgAdmin
- Laravel Eloquent ORM
- Laravel Migrations
- pg_dump
- pg_restore

## Speech and AI Service

- Python 3.11 x64
- FastAPI
- Uvicorn
- PyTorch
- torchaudio
- Hugging Face Transformers
- Whisper
- Whisper base
- Whisper large-v3-turbo
- faster-whisper
- CTranslate2
- Whisper-compatible feature extraction
- ReaDirect Nu isolated-letter classifier
- ReaDirect Mu transcription model
- NumPy
- SoundFile
- FFmpeg
- jiwer
- CMU Pronouncing Dictionary
- VoxCPM2
- WebSocket
- Streaming HTTP
- uv

## Hosting and Networking

- Caddy
- Cloudflare Free Plan
- Cloudflare DNS
- Cloudflare Proxy
- Cloudflare SSL
- Cloudflare CDN
- Cloudflare DDoS Protection
- Cloudflare Tunnel
- cloudflared

## Testing and Code Quality

### Frontend

- Vitest
- React Testing Library
- Playwright
- ESLint
- Prettier
- TypeScript Compiler
- Lighthouse

### Backend

- PHPUnit
- Laravel Pint

### Speech and AI Service

- Pytest
- Ruff

## Development Tools

- Git
- Node.js LTS x64
- pnpm
- Composer
- uv
- CMake
- vcpkg
- Visual Studio Build Tools

## Asset Production

- Inkscape
- Krita
- Penpot
- Audacity
- Tiled Map Editor
