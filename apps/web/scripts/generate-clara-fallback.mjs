import { chromium } from "@playwright/test";
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptDirectory, "..");
const repositoryRoot = path.resolve(webRoot, "../..");
const themeId = process.env.CLARA_THEME_ID ?? "t1";

if (
  themeId !== "t1" &&
  themeId !== "t2" &&
  themeId !== "t3" &&
  themeId !== "t4" &&
  themeId !== "t5" &&
  themeId !== "t6" &&
  themeId !== "t7" &&
  themeId !== "t8"
) {
  throw new Error(`Unsupported Clara fallback theme: ${themeId}`);
}

const fallbackFileName =
  themeId === "t1" ? "clara-default.png" : `clara-${themeId}.png`;
const runtimeOutput = path.join(
  repositoryRoot,
  `assets/live2d/runtime/clara/stills/${fallbackFileName}`,
);
const publicOutput = path.join(
  webRoot,
  `public/assets/live2d/clara/stills/${fallbackFileName}`,
);
const previewOutput = process.env.CLARA_PREVIEW_OUTPUT
  ? path.resolve(repositoryRoot, process.env.CLARA_PREVIEW_OUTPUT)
  : null;
const previewFrameHeight = process.env.CLARA_PREVIEW_FRAME_HEIGHT;
const previewFrameY = process.env.CLARA_PREVIEW_FRAME_Y;

if ((previewFrameHeight || previewFrameY) && !previewOutput) {
  throw new Error(
    "CLARA_PREVIEW_OUTPUT is required when preview crop values are supplied.",
  );
}

const previewCropPlugin = {
  name: "clara-preview-crop",
  enforce: "pre",
  transform(source, id) {
    if (!id.endsWith("ClaraWebGLRenderer.ts")) {
      return null;
    }

    let transformedSource = source;

    if (previewFrameHeight) {
      transformedSource = transformedSource.replace(
        /const PASSPORT_FRAME_HEIGHT = [-\d.]+;/,
        `const PASSPORT_FRAME_HEIGHT = ${Number(previewFrameHeight)};`,
      );
    }

    if (previewFrameY) {
      transformedSource = transformedSource.replace(
        /const PASSPORT_FRAME_Y = [-\d.]+;/,
        `const PASSPORT_FRAME_Y = ${Number(previewFrameY)};`,
      );
    }

    return transformedSource;
  },
};

const captureSize = 512;
const captureScale = 2;
const outputSize = captureSize * captureScale;
const captureStyles = `
  html,
  body,
  #root,
  .intro-page,
  .intro-page__content {
    background: none !important;
  }

  html,
  body,
  #root,
  .intro-page,
  .intro-page__content {
    width: ${captureSize}px !important;
    height: ${captureSize}px !important;
    min-height: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
  }

  .intro-page__brand,
  .theme-selector,
  .pointer-trail,
  .vector-cursor {
    display: none !important;
  }

  .clara-stage {
    position: absolute !important;
    inset: 0 !important;
    width: ${captureSize}px !important;
    height: ${captureSize}px !important;
    margin: 0 !important;
    opacity: 1 !important;
    transform: none !important;
  }

  .clara-stage__portrait-wrap {
    display: none !important;
  }

  .clara-stage__canvas {
    opacity: 1 !important;
    transition: none !important;
  }
`;

const server = await createServer({
  root: webRoot,
  logLevel: "error",
  plugins: previewOutput ? [previewCropPlugin] : [],
  server: {
    host: "127.0.0.1",
    port: 4175,
  },
});

let browser;

try {
  await server.listen();
  const captureUrl = server.resolvedUrls?.local[0];

  if (!captureUrl) {
    throw new Error("Vite did not provide a local URL for Clara's capture.");
  }

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: captureSize, height: captureSize },
    deviceScaleFactor: captureScale,
    reducedMotion: "reduce",
    colorScheme: "light",
  });
  await context.addInitScript(
    ({ selectedTheme, storageKey }) => {
      window.localStorage.setItem(storageKey, selectedTheme);
      if (document.documentElement) {
        document.documentElement.dataset.theme = selectedTheme;
      }
    },
    { selectedTheme: themeId, storageKey: "readirect.theme" },
  );
  const page = await context.newPage();

  await page.route("**/*", async (route) => {
    if (new URL(route.request().url()).pathname === "/api/experience/intro/settings") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          revision: "clara-fallback-capture",
          display_mode: "live2d",
          speech_mode: "hybrid",
        }),
      });
      return;
    }

    if (route.request().resourceType() !== "document") {
      await route.continue();
      return;
    }

    const response = await route.fetch();
    const html = await response.text();
    const captureHtml = html.replace(
      "</head>",
      `<style data-clara-fallback-capture>${captureStyles}</style></head>`,
    );

    await route.fulfill({ response, body: captureHtml });
  });

  const captureEntryUrl = new URL(captureUrl);
  captureEntryUrl.searchParams.set("entry", "tap");
  await page.goto(captureEntryUrl.href, { waitUntil: "domcontentloaded" });

  const stage = page.locator('.clara-stage[data-live2d-state="ready"]');
  await stage.waitFor({ state: "visible" });
  await page.waitForFunction(
    ([width, height]) => {
      const canvas = document.querySelector(".clara-stage__canvas");
      return (
        canvas instanceof HTMLCanvasElement &&
        canvas.width === width &&
        canvas.height === height
      );
    },
    [outputSize, outputSize],
  );

  const stageBounds = await stage.boundingBox();

  if (!stageBounds) {
    throw new Error("Clara's capture stage has no visible bounds.");
  }

  const primaryOutput = previewOutput ?? runtimeOutput;

  await mkdir(path.dirname(primaryOutput), { recursive: true });
  await page.screenshot({
    path: primaryOutput,
    type: "png",
    clip: stageBounds,
    omitBackground: true,
  });

  if (!previewOutput) {
    await mkdir(path.dirname(publicOutput), { recursive: true });
    await copyFile(runtimeOutput, publicOutput);
  }

  await context.close();

  console.log(
    previewOutput
      ? `Generated Clara's ${outputSize}x${outputSize} crop preview.`
      : `Generated Clara's ${outputSize}x${outputSize} ${themeId} fallback portrait.`,
  );
  console.log(primaryOutput);
  if (!previewOutput) {
    console.log(publicOutput);
  }
} finally {
  await browser?.close();
  await server.close();
}
