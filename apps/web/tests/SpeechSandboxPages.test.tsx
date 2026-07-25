import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppQueryClient } from "../src/app/queryClient";
import { EquivalenceBookPage } from "../src/features/staff-dashboard/EquivalenceBookPage";
import { IsoLetterSandboxPage } from "../src/features/staff-dashboard/IsoLetterSandboxPage";
import { RawConfusionMatrixPage } from "../src/features/staff-dashboard/RawConfusionMatrixPage";
import { TrueSandboxPage } from "../src/features/staff-dashboard/TrueSandboxPage";

const statusResponse = {
  nu: {
    available: true,
    model: "nu",
    task: "isolated_letter_resolution",
    checkpoint: "openai/whisper-large-v3-turbo",
    device: "cuda",
    model_loaded: false,
  },
  mu: {
    available: true,
    model: "mu",
    task: "general_english_transcription",
    checkpoint: "openai/whisper-large-v3-turbo",
    device: "cuda",
    compute_type: "int8_float16",
    model_loaded: false,
  },
};

const contentCatalogResponse = {
  groups: [
    {
      key: "assessment-task-2b",
      label: "Assessment · Task 2B Words",
      source: "assessment",
      activity_key: "task-2b",
      items: [
        {
          content_id: "assessment-v1-task-2b-01",
          item_key: "task-2b-01",
          display_text: "bag",
          expected_text: "bag",
          task_type: "word",
        },
      ],
    },
    {
      key: "lesson-6",
      label: "Lesson 6 · Comprehension Answers",
      source: "lesson",
      activity_key: "required-lesson-6",
      items: [
        {
          content_id: "lesson-v1-comprehension-who-lena",
          item_key: "lesson-v1-comprehension-who-lena",
          display_text: "lena",
          expected_text: "lena",
          task_type: "comprehension",
        },
      ],
    },
  ],
  summary: {
    total_items: 2,
    assessment_items: 1,
    lesson_items: 1,
  },
};

const equivalenceBookResponse = {
  rules: [
    {
      id: 7,
      rule_type: "accepted_variant",
      expected_text: "a red bag",
      recognized_text: "a read bag",
      scope: "global",
      item_key: null,
      notes: "Reviewed in True Sandbox.",
      is_active: true,
      created_by: "System Administrator",
      created_at: "2026-07-21T10:00:00+08:00",
    },
  ],
  summary: { total: 1, active: 1, inactive: 0 },
};

function binaryClassificationResponse(scope: "overall" | "content" | "letter") {
  return {
    scope,
    evaluation_version: `${scope}-distractor-raw-v1`,
    acceptance_rule: "normalized_raw_exact_match",
    positive_attempts: 3,
    negative_attempts: 3,
    true_positives: 2,
    true_negatives: 2,
    false_positives: 1,
    false_negatives: 1,
    accuracy: 0.6667,
    precision: 0.6667,
    recall: 0.6667,
    specificity: 0.6667,
    f1_score: 0.6667,
    false_positive_rate: 0.3333,
    false_negative_rate: 0.3333,
    negative_sources: {
      fptn: { attempts: 2, false_positives: 1, true_negatives: 1 },
      silence: { attempts: 1, false_positives: 0, true_negatives: 1 },
    },
  };
}

const rawConfusionMatrixResponse = {
  mode: "raw",
  audit_version: "two-voice-item-token-v1",
  letter_audit_version: "three-voice-letter-alias-v1",
  selected_filters: { fixture_set: null, task_type: null },
  available_filters: {
    fixture_sets: ["jz", "millie2", "millie2-plus", "shai"],
    task_types: ["letter", "phrase", "word"],
  },
  summary: {
    attempts: 3,
    exact_attempts: 2,
    mismatched_attempts: 1,
    expected_tokens: 3,
    matched_tokens: 2,
    substitutions: 1,
    omissions: 0,
    insertions: 0,
    raw_token_accuracy: 0.6667,
  },
  binary_classification: binaryClassificationResponse("overall"),
  binary_classifications: {
    overall: binaryClassificationResponse("overall"),
    content: binaryClassificationResponse("content"),
    letter: binaryClassificationResponse("letter"),
  },
  labels: {
    expected: ["cat"],
    recognized: ["cap", "cat"],
  },
  cells: [
    { expected: "cat", recognized: "cap", count: 1, kind: "confusion" },
    { expected: "cat", recognized: "cat", count: 2, kind: "match" },
  ],
  confusions: [
    { expected: "cat", recognized: "cap", count: 1, kind: "confusion" },
  ],
  generated_at: "2026-07-21T10:00:00+08:00",
};

function prepareSession() {
  window.sessionStorage.setItem(
    "readirect.staff-session",
    JSON.stringify({
      token: "system-admin-token".repeat(4),
      session: { expires_at: "2099-01-01T00:00:00Z" },
      staff: {
        id: 1,
        username: "rd07170",
        email: null,
        display_name: "System Administrator",
        role: "system_admin",
        school: null,
        requires_school_setup: false,
        requires_credential_setup: false,
      },
    }),
  );
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      const payload = url.includes("confusion-matrix/raw")
        ? rawConfusionMatrixResponse
        : url.includes("speech/content-catalog")
          ? contentCatalogResponse
          : url.includes("equivalence-rules")
            ? equivalenceBookResponse
            : statusResponse;

      return Promise.resolve(
        new Response(JSON.stringify(payload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }),
  );
}

function renderPage(page: ReactNode, path: string) {
  return render(
    <QueryClientProvider client={createAppQueryClient()}>
      <MemoryRouter initialEntries={[path]}>{page}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("system-admin speech sandboxes", () => {
  afterEach(() => {
    window.sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("opens the Nu-only isolated-letter workspace from active navigation", async () => {
    prepareSession();
    renderPage(
      <IsoLetterSandboxPage />,
      "/staff/system-admin/isoletter-sandbox",
    );

    expect(
      screen.getByRole("heading", { name: "IsoLetter Sandbox" }),
    ).toBeVisible();
    expect(screen.getByLabelText("Expected letter")).toHaveValue("A");
    expect(await screen.findByText("Nu available")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "IsoLetter Sandbox" }),
    ).toHaveAttribute("aria-current", "page");
    expect(screen.queryByLabelText("Expected text")).not.toBeInTheDocument();
  });

  it("opens the Mu-only transcript and Equivalence Book review workspace", async () => {
    const user = userEvent.setup();
    prepareSession();
    renderPage(<TrueSandboxPage />, "/staff/system-admin/true-sandbox");

    expect(screen.getByRole("heading", { name: "True Sandbox" })).toBeVisible();
    expect(screen.getByLabelText("Expected text")).toBeVisible();
    expect(screen.getByLabelText("Reading type")).toHaveValue("word");
    expect(await screen.findByText("Mu available")).toBeVisible();
    const contentSelect = await screen.findByLabelText(
      "Assessment or lesson item",
    );
    expect(screen.getByRole("option", { name: "bag" })).toBeVisible();
    expect(screen.getByRole("option", { name: "lena" })).toBeVisible();
    await user.selectOptions(contentSelect, "lesson-v1-comprehension-who-lena");
    expect(screen.getByLabelText("Expected text")).toHaveValue("lena");
    expect(screen.getByLabelText("Reading type")).toHaveValue("comprehension");
    expect(screen.getByLabelText("Reading type")).toBeDisabled();
    expect(screen.getByRole("link", { name: "True Sandbox" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.queryByLabelText("Expected letter")).not.toBeInTheDocument();
  });

  it("opens the active Equivalence Book workspace from the sidebar", async () => {
    prepareSession();
    renderPage(<EquivalenceBookPage />, "/staff/system-admin/equivalence-book");

    expect(
      screen.getByRole("heading", { name: "Equivalence Book" }),
    ).toBeVisible();
    expect(await screen.findByText("a red bag")).toBeVisible();
    expect(screen.getByText("a read bag")).toBeVisible();
    expect(
      screen.getByRole("table", {
        name: "Approved transcript equivalence rules",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("columnheader", { name: "Expected" }),
    ).toBeVisible();
    expect(
      screen.getByRole("columnheader", { name: "Mu recognized" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Disable rule" })).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Equivalence Book" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("opens the raw Mu confusion matrix from the sidebar", async () => {
    const user = userEvent.setup();
    prepareSession();
    renderPage(
      <RawConfusionMatrixPage />,
      "/staff/system-admin/confusion-matrix",
    );

    expect(
      screen.getByRole("heading", { name: "Raw confusion matrix" }),
    ).toBeVisible();
    expect((await screen.findAllByText("66.67%"))[0]).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Overall TP / TN / FP / FN" }),
    ).toBeVisible();
    await user.selectOptions(
      screen.getByLabelText("Binary evaluation scope"),
      "letter",
    );
    expect(
      screen.getByRole("heading", { name: "Letters TP / TN / FP / FN" }),
    ).toBeVisible();
    expect(screen.getByText("FPTN speech")).toBeVisible();
    expect(
      screen.getByRole("table", { name: "Raw Mu token confusion matrix" }),
    ).toBeVisible();
    expect(
      screen.getByTitle("cat expected, cap recognized: 1"),
    ).toHaveTextContent("1");
    expect(screen.getByLabelText("Voice fixture")).toHaveValue("");
    expect(screen.getByRole("option", { name: "Letters" })).toBeVisible();
    expect(screen.getByLabelText("Matrix view")).toHaveValue("confusions");
    expect(
      screen.getByRole("link", { name: "Confusion Matrix" }),
    ).toHaveAttribute("aria-current", "page");
  });
});
