import { Capacitor } from "@capacitor/core";
import {
  PRODUCTION_API_ORIGIN,
  productionApiOriginForHostname,
} from "../deployment/productionDomains";
import { maybeHandleGuestApiRequest } from "../features/guest/guestApi";

const API_PATH_PREFIX = "/api";

/** Ordinary JSON requests should never leave a page in a permanent loading state. */
export const NORMAL_API_TIMEOUT_MS = 12_000;

/** Speech uploads and generated audio retain a longer, explicit budget. */
export const SPEECH_API_TIMEOUT_MS = 90_000;

export class ApiRequestTimeoutError extends Error {
  constructor() {
    super("We couldn't connect right now. Please try again.");
    this.name = "ApiRequestTimeoutError";
  }
}

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, "");
}

function isAbsoluteUrl(value: string): boolean {
  return /^[a-z][a-z\d+.-]*:/i.test(value) || value.startsWith("//");
}

interface RuntimeApiOriginInput {
  configuredOrigin: string;
  hostname: string;
  native: boolean;
}

export function runtimeApiOrigin({
  configuredOrigin,
  hostname,
  native,
}: RuntimeApiOriginInput): string {
  const configured = normalizeOrigin(configuredOrigin);
  if (configured) return configured;
  if (native) return PRODUCTION_API_ORIGIN;
  return productionApiOriginForHostname(hostname);
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
  const runtimeOrigin = runtimeApiOrigin({
    configuredOrigin: import.meta.env.VITE_API_ORIGIN ?? "",
    hostname: globalThis.location?.hostname ?? "",
    native: Capacitor.isNativePlatform(),
  });

  return resolveApiUrl(path, runtimeOrigin);
}

export function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const resolvedInput = typeof input === "string" ? apiUrl(input) : input;
  const guestResponse = maybeHandleGuestApiRequest(resolvedInput, init);
  if (guestResponse) return Promise.resolve(guestResponse);

  return globalThis.fetch(resolvedInput, {
    ...init,
    credentials: init?.credentials ?? "include",
  });
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === "AbortError"
    : error instanceof Error && error.name === "AbortError";
}

/**
 * Fetch a normal JSON request with a bounded wait while preserving a caller's
 * cancellation signal and the shared API transport behavior.
 */
export async function apiFetchWithNormalTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  return apiFetchWithTimeout(input, init, NORMAL_API_TIMEOUT_MS);
}

/** Fetch an API request with an explicit bounded wait. */
export async function apiFetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = SPEECH_API_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  let timedOut = false;
  const timeout = globalThis.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const resolvedInput = typeof input === "string" ? apiUrl(input) : input;

  const callerSignal = init.signal;
  const abortFromCaller = () => controller.abort(callerSignal?.reason);

  if (callerSignal?.aborted) {
    abortFromCaller();
  } else {
    callerSignal?.addEventListener("abort", abortFromCaller, { once: true });
  }

  try {
    return await apiFetch(resolvedInput, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (timedOut) {
      throw new ApiRequestTimeoutError();
    }
    if (callerSignal?.aborted && isAbortError(error)) {
      throw error;
    }
    if (error instanceof TypeError) {
      throw new Error("We couldn't connect right now. Please try again.");
    }
    throw error;
  } finally {
    globalThis.clearTimeout(timeout);
    callerSignal?.removeEventListener("abort", abortFromCaller);
  }
}
