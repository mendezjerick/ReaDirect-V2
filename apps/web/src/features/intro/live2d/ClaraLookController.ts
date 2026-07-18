import type { CubismModel } from "@cubism-framework/model/cubismmodel";

import type { ClaraLookTarget } from "./ClaraInteractionTracker";

type LookParameterId =
  | "ParamEyeBallX"
  | "ParamEyeBallY"
  | "ParamAngleX"
  | "ParamAngleY"
  | "ParamBodyAngleX"
  | "ParamBodyAngleY";

interface ResolvedLookParameter {
  index: number;
  minimum: number;
  defaultValue: number;
  maximum: number;
}

const LOOK_PARAMETER_WEIGHTS = {
  ParamEyeBallX: 0.82,
  ParamEyeBallY: 0.82,
  ParamAngleX: 0.22,
  ParamAngleY: 0.16,
  ParamBodyAngleX: 0.1,
  ParamBodyAngleY: 0.06,
} as const satisfies Record<LookParameterId, number>;

const ACTIVE_RESPONSE_PER_SECOND = 11;
const RETURN_RESPONSE_PER_SECOND = 7;

function clampSignedUnit(value: number) {
  return Math.min(1, Math.max(-1, value));
}

export function resolveClaraLookOffset(
  normalizedValue: number,
  minimum: number,
  defaultValue: number,
  maximum: number,
  weight: number,
) {
  const normalized = clampSignedUnit(normalizedValue);
  const availableRange =
    normalized >= 0 ? maximum - defaultValue : defaultValue - minimum;
  return normalized * Math.max(0, availableRange) * weight;
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

export class ClaraLookController {
  private readonly parameters: Record<LookParameterId, ResolvedLookParameter>;
  private currentX = 0;
  private currentY = 0;

  public constructor(private readonly model: CubismModel) {
    this.parameters = Object.fromEntries(
      (Object.keys(LOOK_PARAMETER_WEIGHTS) as LookParameterId[]).map(
        (parameterId) => [parameterId, this.resolveParameter(parameterId)],
      ),
    ) as Record<LookParameterId, ResolvedLookParameter>;
  }

  private resolveParameter(parameterId: LookParameterId) {
    const parameters = this.model.getModel().parameters;
    const index = parameters.ids.indexOf(parameterId);
    if (index < 0) {
      throw new Error(
        `Ma'am Clara is missing the required ${parameterId} tracking parameter.`,
      );
    }

    return {
      index,
      minimum: parameters.minimumValues[index],
      defaultValue: parameters.defaultValues[index],
      maximum: parameters.maximumValues[index],
    };
  }

  private addLookOffset(parameterId: LookParameterId, normalizedValue: number) {
    const parameter = this.parameters[parameterId];
    this.model.addParameterValueByIndex(
      parameter.index,
      resolveClaraLookOffset(
        normalizedValue,
        parameter.minimum,
        parameter.defaultValue,
        parameter.maximum,
        LOOK_PARAMETER_WEIGHTS[parameterId],
      ),
    );
  }

  public apply(
    target: ClaraLookTarget,
    deltaTimeSeconds: number,
    smoothMotion: boolean,
  ) {
    const targetX = target.active ? clampSignedUnit(target.x) : 0;
    const targetY = target.active ? clampSignedUnit(target.y) : 0;

    if (smoothMotion) {
      const response = target.active
        ? ACTIVE_RESPONSE_PER_SECOND
        : RETURN_RESPONSE_PER_SECOND;
      this.currentX = smoothTowards(
        this.currentX,
        targetX,
        response,
        deltaTimeSeconds,
      );
      this.currentY = smoothTowards(
        this.currentY,
        targetY,
        response,
        deltaTimeSeconds,
      );
    } else {
      this.currentX = targetX;
      this.currentY = targetY;
    }

    this.addLookOffset("ParamEyeBallX", this.currentX);
    this.addLookOffset("ParamEyeBallY", this.currentY);
    this.addLookOffset("ParamAngleX", this.currentX);
    this.addLookOffset("ParamAngleY", this.currentY);
    this.addLookOffset("ParamBodyAngleX", this.currentX);
    this.addLookOffset("ParamBodyAngleY", this.currentY);
  }
}
