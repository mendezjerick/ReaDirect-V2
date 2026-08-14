import { OFFLINE_PRACTICE_LIMITS } from "./offlinePracticeLimits";

const SAFE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/**
 * IDs are intentionally more restrictive than general text. They may be
 * used later as generated local filenames, but they are never trusted as a
 * complete filesystem path.
 */
export function isSafeLocalPathSegment(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (
    value.length === 0 ||
    value.length > OFFLINE_PRACTICE_LIMITS.maxIdLength
  ) {
    return false;
  }
  if (value !== value.trim()) return false;
  if (value.includes("..") || value.includes("/") || value.includes("\\")) {
    return false;
  }
  if (/[\u0000-\u001f\u007f]/.test(value) || value.includes("%")) {
    return false;
  }
  if (!SAFE_ID_PATTERN.test(value)) return false;

  try {
    return decodeURIComponent(value) === value;
  } catch {
    return false;
  }
}

export function isSafeRelativeApiPath(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (
    value.length === 0 ||
    value.length > OFFLINE_PRACTICE_LIMITS.maxPathLength
  ) {
    return false;
  }
  if (!value.startsWith("/api/") || value.includes("//")) return false;
  if (/[\u0000-\u001f\u007f]/.test(value)) return false;

  const segments = value.slice(1).split("/");
  return segments.every(isSafeLocalPathSegment);
}

export function localAssetFileName(assetId: string, extension: string): string {
  if (!isSafeLocalPathSegment(assetId)) {
    throw new Error("Cannot create a local asset filename from an unsafe ID.");
  }
  if (!isSafeLocalPathSegment(extension)) {
    throw new Error(
      "Cannot create a local asset filename from an unsafe extension.",
    );
  }
  return `${assetId}.${extension}`;
}
