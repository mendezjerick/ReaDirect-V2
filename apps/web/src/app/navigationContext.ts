const PAGE_PORTAL_RETURN_KEY = "readirect.navigation.page-portal";
const PAGE_PORTAL_RETURN_PATH = "/staff/system-admin/page-portals";

interface StoredPagePortalOrigin {
  origin: "page-portal";
  returnTo: typeof PAGE_PORTAL_RETURN_PATH;
}

function hasStorage(): boolean {
  return typeof window !== "undefined" && "sessionStorage" in window;
}

export function setPagePortalOrigin(): void {
  if (!hasStorage()) return;

  const value: StoredPagePortalOrigin = {
    origin: "page-portal",
    returnTo: PAGE_PORTAL_RETURN_PATH,
  };
  window.sessionStorage.setItem(PAGE_PORTAL_RETURN_KEY, JSON.stringify(value));
}

export function getPagePortalReturnPath(): string | null {
  if (!hasStorage()) return null;

  try {
    const parsed = JSON.parse(
      window.sessionStorage.getItem(PAGE_PORTAL_RETURN_KEY) ?? "null",
    ) as Partial<StoredPagePortalOrigin> | null;
    return parsed?.origin === "page-portal" &&
      parsed.returnTo === PAGE_PORTAL_RETURN_PATH
      ? PAGE_PORTAL_RETURN_PATH
      : null;
  } catch {
    return null;
  }
}

export function clearPagePortalOrigin(): void {
  if (!hasStorage()) return;
  window.sessionStorage.removeItem(PAGE_PORTAL_RETURN_KEY);
}

export function pagePortalNavigationState(): { entrySource: "page-portal" } {
  return { entrySource: "page-portal" };
}
