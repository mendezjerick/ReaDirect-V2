import { describe, expect, it } from "vitest";

import { readApiJson } from "../src/lib/apiResponse";

const unexpectedResponseMessage =
  "ReaDirect received an unexpected server response. Please try again.";

describe("readApiJson", () => {
  it.each([
    ["application/json", { session: "active" }],
    ["application/problem+json", { title: "Invalid request" }],
  ])("returns parsed data from a %s response", async (contentType, body) => {
    await expect(
      readApiJson(
        new Response(JSON.stringify(body), {
          headers: { "Content-Type": contentType },
        }),
      ),
    ).resolves.toEqual(body);
  });

  it("rejects an HTML response without exposing its body", async () => {
    await expect(
      readApiJson(
        new Response("<!doctype html><title>Proxy error</title>", {
          headers: { "Content-Type": "text/html" },
        }),
      ),
    ).rejects.toThrow(unexpectedResponseMessage);
  });

  it("rejects malformed JSON without exposing parser details", async () => {
    await expect(
      readApiJson(
        new Response("{not valid JSON", {
          headers: { "Content-Type": "application/json" },
        }),
      ),
    ).rejects.toThrow(unexpectedResponseMessage);
  });
});
