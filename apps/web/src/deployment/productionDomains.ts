export const PRODUCTION_LANDING_ORIGIN = "https://readirect.org";
export const PRODUCTION_WEB_APP_ORIGIN = "https://app.readirect.org";
export const PRODUCTION_API_ORIGIN = "https://api.readirect.org";

const PRODUCTION_LANDING_HOSTS = new Set([
  "readirect.org",
  "www.readirect.org",
]);
const PRODUCTION_WEB_APP_HOST = "app.readirect.org";

function normalizedHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/\.$/, "");
}

function normalizedOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, "");
}

export function isProductionLandingHostname(hostname: string): boolean {
  return PRODUCTION_LANDING_HOSTS.has(normalizedHostname(hostname));
}

export function isProductionWebAppHostname(hostname: string): boolean {
  return normalizedHostname(hostname) === PRODUCTION_WEB_APP_HOST;
}

export function browserRootSurface(
  hostname: string,
  search: string,
): "intro" | "landing" {
  const opensTapEntry = new URLSearchParams(search).get("entry") === "tap";

  return opensTapEntry || isProductionWebAppHostname(hostname)
    ? "intro"
    : "landing";
}

export function webAppEntryHref(
  hostname: string,
  configuredOrigin = "",
): string {
  const origin = normalizedOrigin(configuredOrigin);

  if (origin) {
    return `${origin}/`;
  }

  return isProductionLandingHostname(hostname)
    ? `${PRODUCTION_WEB_APP_ORIGIN}/`
    : "/?entry=tap";
}

export function productionApiOriginForHostname(hostname: string): string {
  return isProductionLandingHostname(hostname) ||
    isProductionWebAppHostname(hostname)
    ? PRODUCTION_API_ORIGIN
    : "";
}
