import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { PublicDocsPage } from "../src/features/docs/PublicDocsPage";

function renderDocs(path = "/docs") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/docs" element={<PublicDocsPage />} />
        <Route path="/docs/:docSlug" element={<PublicDocsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("PublicDocsPage", () => {
  it("renders the public documentation hub and safe navigation", () => {
    renderDocs();

    expect(
      screen.getByRole("heading", { name: "ReaDirect Documentation" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: "Getting Started" })[0],
    ).toHaveAttribute("href", "/docs/getting-started");
    expect(screen.getByText("Browse documentation")).toBeInTheDocument();
    expect(
      screen.queryByText(/password|learner code|internal url/i),
    ).not.toBeInTheDocument();
  });

  it.each([
    ["getting-started", "Getting Started"],
    ["user-guide", "User Guide"],
    ["for-teachers", "For Teachers"],
    ["for-schools", "For Schools"],
    ["system-overview", "System Overview"],
    ["testing", "Testing & Quality"],
    ["faq", "Frequently Asked Questions"],
    ["accessibility", "Accessibility"],
    ["privacy", "Privacy & Data Overview"],
  ])("renders the %s public article", (slug, title) => {
    renderDocs(`/docs/${slug}`);
    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to ReaDirect" }),
    ).toHaveAttribute("href", "/landing");
  });

  it("adds a teacher workflow and related quality guidance", () => {
    renderDocs("/docs/for-teachers");

    expect(
      screen.getByRole("heading", { name: "A calm routine for every class." }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "A safe teacher smoke test" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: /Testing & Quality/ })[0],
    ).toHaveAttribute("href", "/docs/testing");
  });

  it("publishes practical, non-destructive testing guidance", () => {
    renderDocs("/docs/testing");

    expect(
      screen.getByRole("heading", { name: "A safe teacher smoke test" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Before reporting an issue" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/non-destructive check/i)).toBeInTheDocument();
  });
});
