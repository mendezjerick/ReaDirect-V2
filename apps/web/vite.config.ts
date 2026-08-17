import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import { defineConfig, type Plugin } from "vite";

type OfflineApkBoundary = {
  target: "offline-apk";
  entry: string;
  output_directory: string;
  forbidden_module_fragments: string[];
  forbidden_bundle_tokens: string[];
  forbidden_output_fragments: string[];
};

type OfflineClaraAssetManifest = {
  assets: Array<{
    source: string;
    output: string;
    bytes: number;
    sha256: string;
  }>;
};

const offlineBoundaryPath = fileURLToPath(
  new URL("./offline-apk-boundary.json", import.meta.url),
);
const offlineClaraManifestPath = fileURLToPath(
  new URL("./offline-clara-assets.json", import.meta.url),
);
const offlineJourneyManifestPath = fileURLToPath(
  new URL("./offline-journey-assets.json", import.meta.url),
);

function readOfflineApkBoundary(): OfflineApkBoundary {
  return JSON.parse(
    readFileSync(offlineBoundaryPath, "utf8"),
  ) as OfflineApkBoundary;
}

function normalizeBoundaryValue(value: string): string {
  return value.replaceAll("\\", "/").toLowerCase();
}

function offlineAssetsPlugin(name: string, manifestPath: string): Plugin {
  const manifest = JSON.parse(
    readFileSync(manifestPath, "utf8"),
  ) as OfflineClaraAssetManifest;

  return {
    name: `readirect-offline-${name}-assets`,
    buildStart() {
      for (const asset of manifest.assets) {
        const sourcePath = fileURLToPath(
          new URL(`./public/${asset.source}`, import.meta.url),
        );
        const source = readFileSync(sourcePath);
        const sha256 = createHash("sha256").update(source).digest("hex");

        if (source.byteLength !== asset.bytes || sha256 !== asset.sha256) {
          this.error(
            `Offline ${name} asset failed integrity verification: ${asset.source}.`,
          );
        }

        this.emitFile({
          type: "asset",
          fileName: asset.output,
          source,
        });
      }
    },
  };
}

function offlineApkBoundaryPlugin(boundary: OfflineApkBoundary): Plugin {
  return {
    name: "readirect-offline-apk-boundary",
    enforce: "pre",
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        return html
          .replace("/src/main.tsx", `/${boundary.entry}`)
          .replace(
            /\s*<script src="\/assets\/live2d\/core\/live2dcubismcore\.min\.js"><\/script>/,
            "",
          )
          .replace(
            /\s*<link\s+rel="preload"\s+href="\/assets\/fonts\/[^\"]+"[\s\S]*?\/>/g,
            "",
          );
      },
    },
    generateBundle(_options, bundle) {
      this.emitFile({
        type: "asset",
        fileName: "offline-apk-build.json",
        source: JSON.stringify({
          target: boundary.target,
          entry: boundary.entry,
        }),
      });

      const forbiddenModules = boundary.forbidden_module_fragments.map(
        normalizeBoundaryValue,
      );
      const forbiddenOutputs = boundary.forbidden_output_fragments.map(
        normalizeBoundaryValue,
      );

      for (const output of Object.values(bundle)) {
        const outputName = normalizeBoundaryValue(output.fileName);
        const outputViolation = forbiddenOutputs.find((fragment) =>
          outputName.includes(fragment),
        );

        if (outputViolation) {
          this.error(
            `Offline APK emitted forbidden output ${output.fileName} (${outputViolation}).`,
          );
        }

        if (output.type !== "chunk") {
          continue;
        }

        for (const moduleId of Object.keys(output.modules)) {
          const normalizedId = normalizeBoundaryValue(moduleId);
          const moduleViolation = forbiddenModules.find((fragment) =>
            normalizedId.includes(fragment),
          );

          if (moduleViolation) {
            this.error(
              `Offline APK imported forbidden module ${moduleId} (${moduleViolation}).`,
            );
          }
        }

        const bundleViolation = boundary.forbidden_bundle_tokens.find((token) =>
          output.code.includes(token),
        );

        if (bundleViolation) {
          this.error(
            `Offline APK emitted forbidden runtime token ${bundleViolation} in ${output.fileName}.`,
          );
        }
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const isOfflineApk = mode === "offline-apk";
  const offlineBoundary = isOfflineApk ? readOfflineApkBoundary() : null;

  return {
    publicDir: isOfflineApk ? false : "public",
    plugins: [
      react(),
      tailwindcss(),
      ...(offlineBoundary
        ? [
            offlineAssetsPlugin("clara", offlineClaraManifestPath),
            offlineAssetsPlugin("journey", offlineJourneyManifestPath),
          ]
        : []),
      ...(offlineBoundary ? [offlineApkBoundaryPlugin(offlineBoundary)] : []),
    ],
    build: offlineBoundary
      ? {
          outDir: offlineBoundary.output_directory,
          manifest: true,
          emptyOutDir: true,
        }
      : undefined,
    server: isOfflineApk
      ? undefined
      : {
          proxy: {
            "/api": "http://127.0.0.1:8000",
            "/app": {
              target: "ws://127.0.0.1:8080",
              ws: true,
            },
          },
        },
    resolve: {
      alias: {
        "@cubism-framework": fileURLToPath(
          new URL("./vendor/live2d/CubismWebFramework/dist", import.meta.url),
        ),
      },
    },
  };
});
