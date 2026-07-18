export interface RgbaColor {
  red: number;
  green: number;
  blue: number;
  alpha: number;
}

export function readCssColor(variableName: `--color-${string}`): RgbaColor {
  const rawValue = getComputedStyle(document.documentElement)
    .getPropertyValue(variableName)
    .trim();

  if (!rawValue) {
    throw new Error(`The required theme color ${variableName} is not defined.`);
  }

  const probe = document.createElement("span");
  probe.style.color = `var(${variableName})`;
  probe.style.display = "none";
  document.body.append(probe);
  const resolvedColor = getComputedStyle(probe).color;
  probe.remove();

  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    throw new Error("The browser could not resolve the active theme colors.");
  }

  context.clearRect(0, 0, 1, 1);
  context.fillStyle = resolvedColor;
  context.fillRect(0, 0, 1, 1);
  const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data;

  return {
    red: red / 255,
    green: green / 255,
    blue: blue / 255,
    alpha: alpha / 255,
  };
}
