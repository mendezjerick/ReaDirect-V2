import { apiUrl } from "../../lib/apiUrl";

export type ApiReachability =
  "unknown" | "checking" | "reachable" | "unreachable" | "unauthorized";

export interface ApiProbeResult {
  readonly status: Exclude<ApiReachability, "unknown" | "checking">;
  readonly httpStatus?: number;
}

export interface ApiProbeOptions {
  readonly token?: string | null;
  readonly timeoutMs?: number;
  readonly signal?: AbortSignal;
  readonly fetchImpl?: typeof fetch;
}

const DEFAULT_TIMEOUT_MS = 5_000;

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export async function probeApiReachability({
  token = null,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  signal,
  fetchImpl = globalThis.fetch,
}: ApiProbeOptions = {}): Promise<ApiProbeResult> {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(
    () => controller.abort(),
    Math.max(250, timeoutMs),
  );
  const abortParent = () => controller.abort();

  if (signal?.aborted) {
    controller.abort();
  } else {
    signal?.addEventListener("abort", abortParent, { once: true });
  }

  try {
    const headers: Record<string, string> = { Accept: "application/json" };
    const path = token
      ? "/api/learners/session"
      : "/api/experience/intro/settings";

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetchImpl(apiUrl(path), {
      method: "GET",
      headers,
      signal: controller.signal,
    });

    if (response.status === 401 || response.status === 403) {
      return { status: "unauthorized", httpStatus: response.status };
    }

    return response.ok
      ? { status: "reachable", httpStatus: response.status }
      : { status: "unreachable", httpStatus: response.status };
  } catch (error) {
    if (isAbortError(error) && signal?.aborted) {
      throw error;
    }

    return { status: "unreachable" };
  } finally {
    globalThis.clearTimeout(timeout);
    signal?.removeEventListener("abort", abortParent);
  }
}
