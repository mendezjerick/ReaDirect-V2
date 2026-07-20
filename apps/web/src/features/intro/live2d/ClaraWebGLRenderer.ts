/**
 * Clara's small application adapter for the official Live2D Cubism Web
 * Framework. Framework and Core remain vendor dependencies under their
 * respective Live2D licenses.
 */
import { CubismDefaultParameterId } from "@cubism-framework/cubismdefaultparameterid";
import { CubismModelSettingJson } from "@cubism-framework/cubismmodelsettingjson";
import {
  BreathParameterData,
  CubismBreath,
} from "@cubism-framework/effect/cubismbreath";
import type { ICubismModelSetting } from "@cubism-framework/icubismmodelsetting";
import { CubismFramework } from "@cubism-framework/live2dcubismframework";
import { CubismMatrix44 } from "@cubism-framework/math/cubismmatrix44";
import { CubismUserModel } from "@cubism-framework/model/cubismusermodel";
import { CubismWebGLOffscreenManager } from "@cubism-framework/rendering/cubismoffscreenmanager";

import { readCssColor, type RgbaColor } from "./readCssColor";
import {
  ClaraExpressionController,
  normalizeClaraEyeOpenness,
  type ClaraPresentationState,
} from "./ClaraExpressionController";
import type { ClaraLookTarget } from "./ClaraInteractionTracker";
import { ClaraLookController } from "./ClaraLookController";

const MODEL_DIRECTORY = "/assets/live2d/clara/";
const MODEL_MANIFEST = "CherryGoth.model3.json";
const SHADER_DIRECTORY = "/assets/live2d/shaders/";
const MAX_DEVICE_PIXEL_RATIO = 2;
const PASSPORT_FRAME_HEIGHT = 4.55;
const PASSPORT_FRAME_X = 0;
const PASSPORT_FRAME_Y = -1.28015625;
const DEFAULT_SPEAKING_MOUTH_LEVEL = 0.45;
const SPEAKING_MOUTH_MINIMUM = 0.12;
const SPEAKING_MOUTH_RANGE = 0.68;
const SPEAKING_CYCLE_RADIANS_PER_SECOND = 11;
const HIDDEN_DRAWABLE_IDS = ["collar"] as const;
const CATCHLIGHT_VISIBILITY_RULES = [
  {
    drawableId: "ArtMesh47",
    eyeOpenParameterId: "ParamEyeROpen",
  },
  {
    drawableId: "ArtMesh65",
    eyeOpenParameterId: "ParamEyeLOpen",
  },
] as const;
const PARAMETER_OVERRIDE_GROUPS = [
  {
    parameterId: "Param18",
    value: 1,
  },
] as const;
const COLOR_OVERRIDE_GROUPS = [
  {
    colorVariable: "--color-clara-hair",
    drawableIds: [
      "ArtMesh13",
      "ArtMesh14",
      "ArtMesh15",
      "ArtMesh18",
      "ArtMesh21",
    ],
  },
  {
    colorVariable: "--color-clara-hair-outline",
    drawableIds: [
      "ArtMesh11",
      "ArtMesh12",
      "ArtMesh16",
      "ArtMesh17",
      "ArtMesh19",
      "ArtMesh20",
      "ArtMesh84",
    ],
  },
  {
    colorVariable: "--color-clara-hair-highlight",
    drawableIds: ["ArtMesh8"],
  },
  {
    colorVariable: "--color-clara-hair-shadow",
    drawableIds: [
      "ArtMesh85",
      "ArtMesh55",
      "ArtMesh96",
      "ArtMesh100",
      "ArtMesh58",
      "ArtMesh70",
    ],
  },
  {
    colorVariable: "--color-clara-hair-deep-shadow",
    drawableIds: [
      "ArtMesh10",
      "ArtMesh22",
      "ArtMesh51",
      "ArtMesh52",
      "ArtMesh53",
      "ArtMesh54",
      "ArtMesh56",
      "ArtMesh57",
      "ArtMesh68",
      "ArtMesh72",
      "ArtMesh94",
      "ArtMesh95",
      "ArtMesh97",
      "ArtMesh98",
    ],
  },
  {
    colorVariable: "--color-clara-glasses",
    drawableIds: ["ArtMesh6", "ArtMesh30"],
  },
  {
    colorVariable: "--color-clara-skin-primary",
    drawableIds: ["ArtMesh59", "ArtMesh77", "ArtMesh83", "ArtMesh99"],
  },
  {
    colorVariable: "--color-clara-skin-shade",
    drawableIds: [
      "nose2",
      "ArtMesh69",
      "ArtMesh71",
      "ArtMesh74",
      "ArtMesh82",
      "ArtMesh90",
      "ArtMesh91",
      "ArtMesh92",
    ],
  },
  {
    colorVariable: "--color-clara-hoodie",
    drawableIds: ["hoodie"],
  },
  {
    colorVariable: "--color-clara-strings",
    drawableIds: ["ArtMesh86", "ArtMesh89"],
  },
] as const;

interface ResolvedColorOverride {
  colorVariable: (typeof COLOR_OVERRIDE_GROUPS)[number]["colorVariable"];
  drawableIndices: number[];
}

interface ResolvedParameterOverride {
  parameterIndex: number;
  value: number;
}

interface ResolvedCatchlightVisibilityRule {
  drawableIndex: number;
  eyeOpenParameterIndex: number;
  minimumEyeOpen: number;
  defaultEyeOpen: number;
}

async function fetchBuffer(url: string, signal: AbortSignal) {
  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(`Live2D asset failed to load (${response.status}): ${url}`);
  }

  return response.arrayBuffer();
}

async function fetchBlob(url: string, signal: AbortSignal) {
  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(
      `Live2D texture failed to load (${response.status}): ${url}`,
    );
  }

  return response.blob();
}

export class ClaraWebGLRenderer extends CubismUserModel {
  private readonly canvas: HTMLCanvasElement;
  private readonly gl: WebGLRenderingContext | WebGL2RenderingContext;
  private readonly textures: WebGLTexture[] = [];
  private readonly hiddenDrawableIndices: number[] = [];
  private readonly colorOverrides: ResolvedColorOverride[] = [];
  private readonly parameterOverrides: ResolvedParameterOverride[] = [];
  private readonly catchlightVisibilityRules: ResolvedCatchlightVisibilityRule[] =
    [];
  private canvasClearColor: RgbaColor;
  private expressionController: ClaraExpressionController | null = null;
  private lookController: ClaraLookController | null = null;
  private speakingElapsedSeconds = 0;
  private frameBuffer: WebGLFramebuffer | null = null;
  private ready = false;
  private released = false;

  public constructor(canvas: HTMLCanvasElement) {
    super();
    this.canvas = canvas;
    this.canvasClearColor = readCssColor("--color-live2d-canvas-clear");

    const contextOptions: WebGLContextAttributes = {
      alpha: true,
      antialias: true,
      depth: true,
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
    };

    const context =
      canvas.getContext("webgl2", contextOptions) ??
      canvas.getContext("webgl", contextOptions);

    if (!context) {
      throw new Error("This browser does not provide a WebGL context.");
    }

    this.gl = context;
    this.resize();
  }

  public async initialize(signal: AbortSignal): Promise<void> {
    const manifestBuffer = await fetchBuffer(
      `${MODEL_DIRECTORY}${MODEL_MANIFEST}`,
      signal,
    );
    const setting: ICubismModelSetting = new CubismModelSettingJson(
      manifestBuffer,
      manifestBuffer.byteLength,
    );

    const modelFileName = setting.getModelFileName();
    if (!modelFileName) {
      throw new Error(
        "Clara's model manifest does not reference a .moc3 file.",
      );
    }

    const modelBuffer = await fetchBuffer(
      `${MODEL_DIRECTORY}${modelFileName}`,
      signal,
    );
    signal.throwIfAborted();
    this.loadModel(modelBuffer, true);

    if (!this.getModel()) {
      throw new Error("Cubism Core could not create Clara's model.");
    }

    this.expressionController = new ClaraExpressionController(this._model);
    this.lookController = new ClaraLookController(this._model);
    this.configureAppearance();

    const physicsFileName = setting.getPhysicsFileName();
    if (physicsFileName) {
      const physicsBuffer = await fetchBuffer(
        `${MODEL_DIRECTORY}${physicsFileName}`,
        signal,
      );
      signal.throwIfAborted();
      this.loadPhysics(physicsBuffer, physicsBuffer.byteLength);
    }

    this.configureBreathing();

    const layout = new Map<string, number>();
    setting.getLayoutMap(layout);
    this.getModelMatrix().setupFromLayout(layout);
    const modelMatrix = this.getModelMatrix();
    modelMatrix.setHeight(PASSPORT_FRAME_HEIGHT);
    modelMatrix.setPosition(PASSPORT_FRAME_X, PASSPORT_FRAME_Y);

    this.createRenderer(this.canvas.width, this.canvas.height);
    const renderer = this.getRenderer();
    renderer.startUp(this.gl);
    renderer.setIsPremultipliedAlpha(true);
    renderer.loadShaders(SHADER_DIRECTORY);

    const texturePromises = Array.from(
      { length: setting.getTextureCount() },
      (_, textureIndex) =>
        this.loadTexture(
          `${MODEL_DIRECTORY}${setting.getTextureFileName(textureIndex)}`,
          textureIndex,
          signal,
        ),
    );

    await Promise.all(texturePromises);
    signal.throwIfAborted();

    this.frameBuffer = this.gl.getParameter(
      this.gl.FRAMEBUFFER_BINDING,
    ) as WebGLFramebuffer | null;
    this.ready = true;
  }

  private configureBreathing() {
    this._breath = CubismBreath.create();
    this._breath.setParameters([
      new BreathParameterData(
        CubismFramework.getIdManager().getId(
          CubismDefaultParameterId.ParamAngleX,
        ),
        0,
        4,
        6.5,
        0.3,
      ),
      new BreathParameterData(
        CubismFramework.getIdManager().getId(
          CubismDefaultParameterId.ParamAngleY,
        ),
        0,
        2,
        3.5,
        0.3,
      ),
      new BreathParameterData(
        CubismFramework.getIdManager().getId(
          CubismDefaultParameterId.ParamBodyAngleX,
        ),
        0,
        2,
        15.5,
        0.25,
      ),
      new BreathParameterData(
        CubismFramework.getIdManager().getId(
          CubismDefaultParameterId.ParamBreath,
        ),
        0.5,
        0.5,
        3.2,
        0.8,
      ),
    ]);
  }

  private configureAppearance() {
    for (const override of PARAMETER_OVERRIDE_GROUPS) {
      this.parameterOverrides.push({
        parameterIndex: this.getRequiredParameterIndex(override.parameterId),
        value: override.value,
      });
    }

    for (const drawableId of HIDDEN_DRAWABLE_IDS) {
      this.hiddenDrawableIndices.push(
        this.getRequiredDrawableIndex(drawableId),
      );
    }

    const coreParameters = this._model.getModel().parameters;
    for (const rule of CATCHLIGHT_VISIBILITY_RULES) {
      const eyeOpenParameterIndex = this.getRequiredParameterIndex(
        rule.eyeOpenParameterId,
      );
      this.catchlightVisibilityRules.push({
        drawableIndex: this.getRequiredDrawableIndex(rule.drawableId),
        eyeOpenParameterIndex,
        minimumEyeOpen: coreParameters.minimumValues[eyeOpenParameterIndex],
        defaultEyeOpen: coreParameters.defaultValues[eyeOpenParameterIndex],
      });
    }

    for (const group of COLOR_OVERRIDE_GROUPS) {
      this.colorOverrides.push({
        colorVariable: group.colorVariable,
        drawableIndices: group.drawableIds.map((drawableId) =>
          this.getRequiredDrawableIndex(drawableId),
        ),
      });
    }

    this.refreshAppearanceColors();
  }

  private getRequiredParameterIndex(parameterId: string) {
    const parameterIndex = this._model
      .getModel()
      .parameters.ids.indexOf(parameterId);

    if (parameterIndex < 0) {
      throw new Error(
        `Ma'am Clara is missing the required ${parameterId} parameter.`,
      );
    }

    return parameterIndex;
  }

  private getRequiredDrawableIndex(drawableId: string) {
    const drawableIndex = this._model.getDrawableIndex(
      CubismFramework.getIdManager().getId(drawableId),
    );

    if (drawableIndex < 0) {
      throw new Error(
        `Ma'am Clara is missing the required ${drawableId} drawable.`,
      );
    }

    return drawableIndex;
  }

  public refreshAppearanceColors() {
    this.canvasClearColor = readCssColor("--color-live2d-canvas-clear");

    if (!this._model) {
      return;
    }

    const recolorBase = readCssColor("--color-live2d-recolor-base");
    const colorManager = this._model.getOverrideMultiplyAndScreenColor();

    for (const override of this.colorOverrides) {
      const color = readCssColor(override.colorVariable);

      for (const drawableIndex of override.drawableIndices) {
        colorManager.setDrawableMultiplyColorEnabled(drawableIndex, true);
        colorManager.setDrawableMultiplyColorByRGBA(
          drawableIndex,
          recolorBase.red,
          recolorBase.green,
          recolorBase.blue,
          recolorBase.alpha,
        );
        colorManager.setDrawableScreenColorEnabled(drawableIndex, true);
        colorManager.setDrawableScreenColorByRGBA(
          drawableIndex,
          color.red,
          color.green,
          color.blue,
          color.alpha,
        );
      }
    }
  }

  private applyParameterOverrides() {
    for (const override of this.parameterOverrides) {
      this._model.setParameterValueByIndex(
        override.parameterIndex,
        override.value,
      );
    }
  }

  private applyDrawableVisibilityOverrides() {
    const drawableOpacities = this._model.getModel().drawables.opacities;

    for (const drawableIndex of this.hiddenDrawableIndices) {
      drawableOpacities[drawableIndex] = 0;
    }

    for (const rule of this.catchlightVisibilityRules) {
      const eyeOpenValue = this._model.getParameterValueByIndex(
        rule.eyeOpenParameterIndex,
      );
      drawableOpacities[rule.drawableIndex] *= normalizeClaraEyeOpenness(
        eyeOpenValue,
        rule.minimumEyeOpen,
        rule.defaultEyeOpen,
      );
    }
  }

  private resolveMouthOpenLevel(
    deltaTimeSeconds: number,
    animateModel: boolean,
    presentation: ClaraPresentationState,
  ) {
    if (!presentation.speaking) {
      this.speakingElapsedSeconds = 0;
      return 0;
    }

    if (presentation.speechLevel !== undefined) {
      return presentation.speechLevel;
    }

    if (!animateModel) {
      return DEFAULT_SPEAKING_MOUTH_LEVEL;
    }

    this.speakingElapsedSeconds += deltaTimeSeconds;
    const cycle =
      0.5 +
      0.5 *
        Math.sin(
          this.speakingElapsedSeconds * SPEAKING_CYCLE_RADIANS_PER_SECOND,
        );

    return SPEAKING_MOUTH_MINIMUM + SPEAKING_MOUTH_RANGE * cycle;
  }

  private async loadTexture(
    url: string,
    textureIndex: number,
    signal: AbortSignal,
  ) {
    const blob = await fetchBlob(url, signal);
    const bitmap = await createImageBitmap(blob);

    try {
      signal.throwIfAborted();

      const maximumTextureSize = this.gl.getParameter(
        this.gl.MAX_TEXTURE_SIZE,
      ) as number;
      if (
        bitmap.width > maximumTextureSize ||
        bitmap.height > maximumTextureSize
      ) {
        throw new Error(
          `Clara's ${bitmap.width}x${bitmap.height} texture exceeds this device's ${maximumTextureSize}px WebGL limit.`,
        );
      }

      const texture = this.gl.createTexture();
      if (!texture) {
        throw new Error("WebGL could not allocate Clara's texture.");
      }

      this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
      this.gl.texParameteri(
        this.gl.TEXTURE_2D,
        this.gl.TEXTURE_MIN_FILTER,
        this.gl.LINEAR_MIPMAP_LINEAR,
      );
      this.gl.texParameteri(
        this.gl.TEXTURE_2D,
        this.gl.TEXTURE_MAG_FILTER,
        this.gl.LINEAR,
      );
      this.gl.pixelStorei(this.gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
      this.gl.texImage2D(
        this.gl.TEXTURE_2D,
        0,
        this.gl.RGBA,
        this.gl.RGBA,
        this.gl.UNSIGNED_BYTE,
        bitmap,
      );
      this.gl.generateMipmap(this.gl.TEXTURE_2D);
      this.gl.bindTexture(this.gl.TEXTURE_2D, null);

      this.textures.push(texture);
      this.getRenderer().bindTexture(textureIndex, texture);
    } finally {
      bitmap.close();
    }
  }

  public resize() {
    const pixelRatio = Math.min(
      window.devicePixelRatio || 1,
      MAX_DEVICE_PIXEL_RATIO,
    );
    const width = Math.max(1, Math.round(this.canvas.clientWidth * pixelRatio));
    const height = Math.max(
      1,
      Math.round(this.canvas.clientHeight * pixelRatio),
    );

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.gl.viewport(0, 0, width, height);

      if (this.ready) {
        this.setRenderTargetSize(width, height);
      }
    }
  }

  public render(
    deltaTimeSeconds: number,
    animateModel: boolean,
    presentation: ClaraPresentationState,
    lookTarget: ClaraLookTarget,
  ) {
    if (!this.ready || this.released || this.gl.isContextLost()) {
      return;
    }

    this._model.loadParameters();
    if (animateModel) {
      this._breath?.updateParameters(this._model, deltaTimeSeconds);
      this._physics?.evaluate(this._model, deltaTimeSeconds);
    }

    this.applyParameterOverrides();
    this.expressionController?.apply(
      presentation.emotion,
      this.resolveMouthOpenLevel(deltaTimeSeconds, animateModel, presentation),
    );

    this._model.saveParameters();
    this.lookController?.apply(lookTarget, deltaTimeSeconds, animateModel);
    this._model.update();
    this.applyDrawableVisibilityOverrides();

    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.gl.clearColor(
      this.canvasClearColor.red,
      this.canvasClearColor.green,
      this.canvasClearColor.blue,
      this.canvasClearColor.alpha,
    );
    this.gl.clearDepth(1);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

    CubismWebGLOffscreenManager.getInstance().beginFrameProcess(this.gl);

    const projection = new CubismMatrix44();
    if (
      this._model.getCanvasWidth() > 1 &&
      this.canvas.width < this.canvas.height
    ) {
      this.getModelMatrix().setWidth(2);
      projection.scale(1, this.canvas.width / this.canvas.height);
    } else {
      projection.scale(this.canvas.height / this.canvas.width, 1);
    }

    projection.multiplyByMatrix(this.getModelMatrix());
    const renderer = this.getRenderer();
    renderer.setMvpMatrix(projection);
    renderer.setRenderState(this.frameBuffer as WebGLFramebuffer, [
      0,
      0,
      this.canvas.width,
      this.canvas.height,
    ]);
    renderer.drawModel(SHADER_DIRECTORY);

    CubismWebGLOffscreenManager.getInstance().endFrameProcess(this.gl);
    CubismWebGLOffscreenManager.getInstance().releaseStaleRenderTextures(
      this.gl,
    );
  }

  public override release() {
    if (this.released) {
      return;
    }

    this.released = true;
    for (const texture of this.textures) {
      this.gl.deleteTexture(texture);
    }
    this.textures.length = 0;
    this.expressionController = null;
    this.lookController = null;
    super.release();
  }
}
