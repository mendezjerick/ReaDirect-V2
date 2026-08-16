const API_PATH_PREFIX = "/api";

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, "");
}

function isAbsoluteUrl(value: string): boolean {
  return /^[a-z][a-z\d+.-]*:/i.test(value) || value.startsWith("//");
}

/**
 * Resolve an application API path for both the browser proxy and Capacitor.
 *
 * An empty origin intentionally preserves relative URLs so local Vite
 * development and same-origin web deployments keep their existing behavior.
 */
export function resolveApiUrl(path: string, apiOrigin = ""): string {
  if (
    path !== API_PATH_PREFIX &&
    !path.startsWith(`${API_PATH_PREFIX}/`) &&
    !path.startsWith(`${API_PATH_PREFIX}?`)
  ) {
    return path;
  }

  const normalizedOrigin = normalizeOrigin(apiOrigin);

  if (!normalizedOrigin || isAbsoluteUrl(path)) {
    return path;
  }

  return `${normalizedOrigin}${path}`;
}

export function apiUrl(path: string): string {
  return resolveApiUrl(path, import.meta.env.VITE_API_ORIGIN ?? "");
}

export function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const resolvedInput = typeof input === "string" ? apiUrl(input) : input;

  return globalThis.fetch(resolvedInput, {
    ...init,
    credentials: init?.credentials ?? "include",
  });
}

/**
 * Fetch an API request with a bounded wait. Speech scoring can take longer
 * than ordinary API calls on a laptop, but the UI must not remain in a
 * permanent loading state when the local ASR service is unavailable.
 */
export async function apiFetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  timeoutMs = 90_000,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  const resolvedInput = typeof input === "string" ? apiUrl(input) : input;

  try {
    return await globalThis.fetch(resolvedInput, {
      ...init,
      credentials: init?.credentials ?? "include",
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(
        "The reading checker took too long to respond. Please try again.",
      );
    }
    throw error;
  } finally {
    globalThis.clearTimeout(timeout);
  }
}
