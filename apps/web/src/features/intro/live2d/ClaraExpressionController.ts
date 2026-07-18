import type { CubismModel } from "@cubism-framework/model/cubismmodel";

export const CLARA_EMOTIONS = [
  "default",
  "happy",
  "thinking",
  "confused",
] as const;

export type ClaraEmotion = (typeof CLARA_EMOTIONS)[number];

export interface ClaraPresentationState {
  emotion: ClaraEmotion;
  speaking: boolean;
  speechLevel?: number;
}

type ControlledParameterId =
  | "ParamEyeLOpen"
  | "ParamEyeROpen"
  | "ParamEyeLSmile"
  | "ParamEyeRSmile"
  | "ParamMouthForm"
  | "ParamMouthOpenY"
  | "Param24";

interface ResolvedParameter {
  index: number;
  minimum: number;
  defaultValue: number;
  maximum: number;
}

const CONTROLLED_PARAMETER_IDS = [
  "ParamEyeLOpen",
  "ParamEyeROpen",
  "ParamEyeLSmile",
  "ParamEyeRSmile",
  "ParamMouthForm",
  "ParamMouthOpenY",
  "Param24",
] as const satisfies readonly ControlledParameterId[];

function clampUnitInterval(value: number) {
  return Math.min(1, Math.max(0, value));
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

  public constructor(model: CubismModel) {
    this.model = model;
    this.parameters = Object.fromEntries(
      CONTROLLED_PARAMETER_IDS.map((parameterId) => [
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

  private resetControlledParameters() {
    for (const parameterId of CONTROLLED_PARAMETER_IDS) {
      this.setParameter(parameterId, this.parameters[parameterId].defaultValue);
    }
  }

  public apply(emotion: ClaraEmotion, mouthOpenLevel: number) {
    this.resetControlledParameters();

    switch (emotion) {
      case "default":
        break;
      case "happy":
        this.setParameter(
          "ParamEyeLOpen",
          this.parameters.ParamEyeLOpen.minimum,
        );
        this.setParameter(
          "ParamEyeROpen",
          this.parameters.ParamEyeROpen.minimum,
        );
        this.setParameter(
          "ParamEyeLSmile",
          this.parameters.ParamEyeLSmile.maximum,
        );
        this.setParameter(
          "ParamEyeRSmile",
          this.parameters.ParamEyeRSmile.maximum,
        );
        this.setParameter(
          "ParamMouthForm",
          this.parameters.ParamMouthForm.maximum,
        );
        break;
      case "thinking":
        this.setParameter(
          "ParamEyeLOpen",
          this.parameters.ParamEyeLOpen.minimum,
        );
        this.setParameter(
          "ParamEyeROpen",
          this.parameters.ParamEyeROpen.minimum,
        );
        break;
      case "confused":
        this.setParameter("Param24", this.parameters.Param24.maximum);
        break;
    }

    const mouthParameter = this.parameters.ParamMouthOpenY;
    const normalizedMouthOpen = clampUnitInterval(mouthOpenLevel);
    const mouthOpenValue =
      mouthParameter.minimum +
      (mouthParameter.maximum - mouthParameter.minimum) * normalizedMouthOpen;
    this.setParameter("ParamMouthOpenY", mouthOpenValue);
  }
}
