import { describe, expect, it } from "vitest";

import {
  browserRootSurface,
  isProductionLandingHostname,
  isProductionWebAppHostname,
  productionApiOriginForHostname,
  webAppEntryHref,
} from "../src/deployment/productionDomains";

describe("production domain routing", () => {
  it("keeps the public landing domain on the landing surface", () => {
    expect(isProductionLandingHostname("readirect.org")).toBe(true);
    expect(isProductionLandingHostname("www.readirect.org.")).toBe(true);
    expect(browserRootSurface("readirect.org", "")).toBe("landing");
  });

  it("opens the production web application at Clara's intro", () => {
    expect(isProductionWebAppHostname("APP.READIRECT.ORG")).toBe(true);
    expect(browserRootSurface("app.readirect.org", "")).toBe("intro");
  });

  it("retains the explicit tap entry for local and staging verification", () => {
    expect(browserRootSurface("localhost", "?entry=tap")).toBe("intro");
    expect(webAppEntryHref("staging.readirect.org")).toBe("/?entry=tap");
  });

  it("sends production landing actions to the app hostname", () => {
    expect(webAppEntryHref("readirect.org")).toBe("https://app.readirect.org/");
    expect(webAppEntryHref("localhost", "https://preview.example.test/")).toBe(
      "https://preview.example.test/",
    );
  });

  it("uses the permanent API origin only on production web hosts", () => {
    expect(productionApiOriginForHostname("readirect.org")).toBe(
      "https://api.readirect.org",
    );
    expect(productionApiOriginForHostname("app.readirect.org")).toBe(
      "https://api.readirect.org",
    );
    expect(productionApiOriginForHostname("localhost")).toBe("");
    expect(productionApiOriginForHostname("staging.readirect.org")).toBe("");
  });
});
