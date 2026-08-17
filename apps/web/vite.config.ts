import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { createHash } from "node:crypto";
import { createReadStream, readFileSync } from "node:fs";
import path from "node:path";
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

type OfflineTtsCatalog = {
  assets: Array<{
    key: string;
    language: "en" | "fil-PH";
    path: string;
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
const offlineMainUiManifestPath = fileURLToPath(
  new URL("./offline-main-ui-assets.json", import.meta.url),
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

function offlineApkSimulatorEntryPlugin(): Plugin {
  return {
    name: "readirect-offline-apk-simulator-entry",
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        return html.replace("/src/main.tsx", "/src/apk/simulator/main.tsx");
      },
    },
  };
}

function offlineApkSimulatorTtsPlugin(): Plugin {
  const packageRoot = fileURLToPath(
    new URL(
      "../../services/tts/storage/offline-apk-package/tts/",
      import.meta.url,
    ),
  );
  const audioRoot = path.resolve(packageRoot, "audio");
  const catalog = JSON.parse(
    readFileSync(path.join(packageRoot, "catalog.json"), "utf8"),
  ) as OfflineTtsCatalog;
  const assets = new Map(
    catalog.assets.map((asset) => [
      `${asset.language}/${asset.key}`,
      asset.path,
    ]),
  );

  return {
    name: "readirect-offline-apk-simulator-tts",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const pathname = new URL(
          request.url ?? "/",
          "http://readirect.local",
        ).pathname;
        const match = pathname.match(
          /^\/__offline-tts\/(en|fil-PH)\/([A-Za-z0-9-]+)\.ogg$/,
        );
        if (!match) {
          next();
          return;
        }

        const packagedPath = assets.get(`${match[1]}/${match[2]}`);
        if (!packagedPath) {
          response.statusCode = 404;
          response.end("Offline Clara cue not found.");
          return;
        }

        const assetPath = path.resolve(audioRoot, packagedPath);
        const relativePath = path.relative(audioRoot, assetPath);
        if (
          relativePath.startsWith("..") ||
          path.isAbsolute(relativePath)
        ) {
          response.statusCode = 403;
          response.end("Invalid offline Clara cue path.");
          return;
        }

        response.statusCode = 200;
        response.setHeader("Content-Type", "audio/ogg");
        response.setHeader("Cache-Control", "no-store");
        createReadStream(assetPath)
          .on("error", () => {
            if (!response.headersSent) response.statusCode = 404;
            response.end();
          })
          .pipe(response);
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const isOfflineApk = mode === "offline-apk";
  const isOfflineApkSimulator = mode === "offline-apk-simulator";
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
            offlineAssetsPlugin("main-ui", offlineMainUiManifestPath),
          ]
        : []),
      ...(offlineBoundary ? [offlineApkBoundaryPlugin(offlineBoundary)] : []),
      ...(isOfflineApkSimulator
        ? [offlineApkSimulatorEntryPlugin(), offlineApkSimulatorTtsPlugin()]
        : []),
    ],
    build: offlineBoundary
      ? {
          outDir: offlineBoundary.output_directory,
          manifest: true,
          emptyOutDir: true,
        }
      : undefined,
    server:
      isOfflineApk || isOfflineApkSimulator
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
