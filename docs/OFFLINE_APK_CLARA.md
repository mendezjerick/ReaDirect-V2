# Offline APK Clara visuals

The APK has two user-facing Clara display modes:

- **Static** uses only `clara-default.png` and never loads the Cubism runtime or animated model.
- **Dynamic** uses the bundled Cubism runtime, Clara model, 8192-pixel texture, physics file, and local shaders.

Dynamic is allowed only when the current device passes every gate: Android is not reporting a low-RAM device, ARM64 is available, total memory is at least 4096 MB, there are at least six logical CPU cores, WebGL is available, and the GPU reports a maximum texture size of at least 8192. A saved Dynamic choice cannot bypass a failed current-device check. If the animated runtime fails after selection, the stage falls back to Static.

`apps/web/offline-clara-assets.json` is the fixed APK asset manifest. Each source file is verified by byte count and SHA-256 during the offline build. The APK build has `publicDir` disabled, so no other public Clara portraits or unrelated public assets are copied implicitly.

Refresh the manifest only after intentionally changing approved Clara assets:

```powershell
node apps/web/scripts/prepare-offline-clara-assets.mjs --refresh-manifest
```

Normal verification must not mutate it:

```powershell
corepack pnpm verify:apk:clara
corepack pnpm --filter @readirect/web build:apk
```
