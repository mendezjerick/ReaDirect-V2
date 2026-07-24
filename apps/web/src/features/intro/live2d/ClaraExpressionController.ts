import type { CubismModel } from "@cubism-framework/model/cubismmodel";

import type {
  ClaraPresentationCue,
  ClaraPresentationState,
  ClaraTeachingBehavior,
} from "./ClaraPresentation";

export {
  CLARA_EMOTIONS,
  CLARA_PRESENTATION_CUES,
  CLARA_TEACHING_BEHAVIORS,
  DEFAULT_CLARA_PRESENTATION,
  type ClaraEmotion,
  type ClaraPresentationCue,
  type ClaraPresentationState,
  type ClaraTeachingBehavior,
} from "./ClaraPresentation";

type ControlledParameterId =
  | "ParamEyeLOpen"
  | "ParamEyeROpen"
  | "ParamEyeLSmile"
  | "ParamEyeRSmile"
  | "ParamBrowLY"
  | "ParamBrowRY"
  | "ParamBrowLAngle"
  | "ParamBrowRAngle"
  | "ParamBrowLForm"
  | "ParamBrowRForm"
  | "ParamMouthForm"
  | "ParamMouthOpenY"
  | "ParamCheek"
  | "ParamAngleZ"
  | "Param4"
  | "Param6"
  | "Param22"
  | "Param24";

interface ResolvedParameter {
  index: number;
  minimum: number;
  defaultValue: number;
  maximum: number;
}

export const CLARA_TEACHING_PARAMETER_IDS = [
  "ParamEyeLOpen",
  "ParamEyeROpen",
  "ParamEyeLSmile",
  "ParamEyeRSmile",
  "ParamBrowLY",
  "ParamBrowRY",
  "ParamBrowLAngle",
  "ParamBrowRAngle",
  "ParamBrowLForm",
  "ParamBrowRForm",
  "ParamMouthForm",
  "ParamMouthOpenY",
  "ParamCheek",
  "ParamAngleZ",
  "Param4",
  "Param6",
  "Param22",
  "Param24",
] as const satisfies readonly ControlledParameterId[];

const EXPRESSION_RESPONSE_PER_SECOND = 9;
const CELEBRATION_BOUNCE_RADIANS_PER_SECOND = 7;

function clampUnitInterval(value: number) {
  return Math.min(1, Math.max(0, value));
}

function clampSignedUnit(value: number) {
  return Math.min(1, Math.max(-1, value));
}

function smoothTowards(
  current: number,
  target: number,
  responsePerSecond: number,
  deltaTimeSeconds: number,
) {
  const blend = 1 - Math.exp(-responsePerSecond * deltaTimeSeconds);
  return current + (target - current) * blend;
}

export function normalizeClaraEyeOpenness(
  value: number,
  minimum: number,
  defaultValue: number,
) {
  const visibleRange = defaultValue - minimum;

  if (visibleRange <= 0) {
    return value > minimum ? 1 : 0;
  }

  return clampUnitInterval((value - minimum) / visibleRange);
}

export class ClaraExpressionController {
  private readonly model: CubismModel;
  private readonly parameters: Record<ControlledParameterId, ResolvedParameter>;
  private readonly currentValues = new Map<ControlledParameterId, number>();
  private activeBehavior: ClaraTeachingBehavior = "neutral";
  private behaviorElapsedSeconds = 0;

  public constructor(model: CubismModel) {
    this.model = model;
    this.parameters = Object.fromEntries(
      CLARA_TEACHING_PARAMETER_IDS.map((parameterId) => [
        parameterId,
        this.resolveRequiredParameter(parameterId),
      ]),
    ) as Record<ControlledParameterId, ResolvedParameter>;
  }

  private resolveRequiredParameter(
    parameterId: ControlledParameterId,
  ): ResolvedParameter {
    const coreParameters = this.model.getModel().parameters;
    const index = coreParameters.ids.indexOf(parameterId);

    if (index < 0) {
      throw new Error(
        `Ma'am Clara is missing the required ${parameterId} expression parameter.`,
      );
    }

    return {
      index,
      minimum: coreParameters.minimumValues[index],
      defaultValue: coreParameters.defaultValues[index],
      maximum: coreParameters.maximumValues[index],
    };
  }

  private setParameter(parameterId: ControlledParameterId, value: number) {
    this.model.setParameterValueByIndex(
      this.parameters[parameterId].index,
      value,
    );
  }

  private normalizedValue(parameterId: ControlledParameterId, value: number) {
    const parameter = this.parameters[parameterId];
    const normalized = clampSignedUnit(value);
    const availableRange =
      normalized >= 0
        ? parameter.maximum - parameter.defaultValue
        : parameter.defaultValue - parameter.minimum;

    return parameter.defaultValue + normalized * Math.max(0, availableRange);
  }

  private setNormalizedTarget(
    targets: Map<ControlledParameterId, number>,
    parameterId: ControlledParameterId,
    value: number,
  ) {
    targets.set(parameterId, this.normalizedValue(parameterId, value));
  }

  private applyHappyFace(targets: Map<ControlledParameterId, number>) {
    this.setNormalizedTarget(targets, "ParamEyeLOpen", -1);
    this.setNormalizedTarget(targets, "ParamEyeROpen", -1);
    this.setNormalizedTarget(targets, "ParamEyeLSmile", 1);
    this.setNormalizedTarget(targets, "ParamEyeRSmile", 1);
    this.setNormalizedTarget(targets, "ParamMouthForm", 1);
  }

  private applyBehavior(
    targets: Map<ControlledParameterId, number>,
    behavior: ClaraTeachingBehavior,
    animateModel: boolean,
  ) {
    switch (behavior) {
      case "neutral":
        break;
      case "listening":
        this.setNormalizedTarget(targets, "ParamBrowLY", 0.12);
        this.setNormalizedTarget(targets, "ParamBrowRY", 0.12);
        break;
      case "encouraging":
        this.setNormalizedTarget(targets, "ParamMouthForm", 0.55);
        this.setNormalizedTarget(targets, "ParamBrowLY", 0.22);
        this.setNormalizedTarget(targets, "ParamBrowRY", 0.22);
        break;
      case "gentle_correction":
        this.setNormalizedTarget(targets, "ParamBrowLY", 0.16);
        this.setNormalizedTarget(targets, "ParamBrowRY", 0.16);
        this.setNormalizedTarget(targets, "ParamBrowLForm", 0.18);
        this.setNormalizedTarget(targets, "ParamBrowRForm", 0.18);
        this.setNormalizedTarget(targets, "ParamMouthForm", -0.06);
        break;
      case "demonstrating":
        this.setNormalizedTarget(targets, "ParamBrowLY", 0.12);
        this.setNormalizedTarget(targets, "ParamBrowRY", 0.12);
        break;
      case "celebrating": {
        this.applyHappyFace(targets);
        if (animateModel) {
          const bounce =
            Math.sin(
              this.behaviorElapsedSeconds *
                CELEBRATION_BOUNCE_RADIANS_PER_SECOND,
            ) * 0.14;
          this.setNormalizedTarget(targets, "Param4", bounce);
          this.setNormalizedTarget(targets, "Param6", bounce * 0.65);
        }
        break;
      }
    }
  }

  private applyCue(
    targets: Map<ControlledParameterId, number>,
    cue: ClaraPresentationCue,
  ) {
    if (cue === "question_mark") {
      this.setNormalizedTarget(targets, "Param24", 1);
    }
  }

  public apply(
    presentation: ClaraPresentationState,
    mouthOpenLevel: number,
    deltaTimeSeconds: number,
    animateModel: boolean,
  ) {
    if (presentation.behavior !== this.activeBehavior) {
      this.activeBehavior = presentation.behavior;
      this.behaviorElapsedSeconds = 0;
    } else if (animateModel) {
      this.behaviorElapsedSeconds += deltaTimeSeconds;
    }

    const targets = new Map<ControlledParameterId, number>(
      CLARA_TEACHING_PARAMETER_IDS.map((parameterId) => [
        parameterId,
        this.parameters[parameterId].defaultValue,
      ]),
    );

    switch (presentation.emotion) {
      case "default":
        break;
      case "happy":
        this.applyHappyFace(targets);
        break;
      case "thinking":
        this.setNormalizedTarget(targets, "ParamEyeLOpen", -1);
        this.setNormalizedTarget(targets, "ParamEyeROpen", -1);
        break;
      case "confused":
        this.setNormalizedTarget(targets, "Param24", 1);
        this.setNormalizedTarget(targets, "ParamBrowLAngle", 0.32);
        this.setNormalizedTarget(targets, "ParamBrowRAngle", -0.32);
        this.setNormalizedTarget(targets, "ParamAngleZ", 0.12);
        break;
    }

    this.applyBehavior(targets, presentation.behavior, animateModel);
    this.applyCue(targets, presentation.cue);

    const mouthParameter = this.parameters.ParamMouthOpenY;
    const normalizedMouthOpen = clampUnitInterval(mouthOpenLevel);
    const mouthOpenValue =
      mouthParameter.minimum +
      (mouthParameter.maximum - mouthParameter.minimum) * normalizedMouthOpen;

    for (const parameterId of CLARA_TEACHING_PARAMETER_IDS) {
      const target =
        parameterId === "ParamMouthOpenY"
          ? mouthOpenValue
          : (targets.get(parameterId) ??
            this.parameters[parameterId].defaultValue);
      const current =
        this.currentValues.get(parameterId) ??
        this.parameters[parameterId].defaultValue;
      const value =
        !animateModel || parameterId === "ParamMouthOpenY"
          ? target
          : smoothTowards(
              current,
              target,
              EXPRESSION_RESPONSE_PER_SECOND,
              deltaTimeSeconds,
            );

      this.currentValues.set(parameterId, value);
      this.setParameter(parameterId, value);
    }
  }
}
