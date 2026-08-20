import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getLearnerSpeechLanguage,
  updateLearnerSpeechLanguage,
} from "../src/features/learner-auth/learnerApi";

const languageContract = {
  speech_language: "en",
  languages: [
    { code: "en", label: "English", available: true, selected: true },
    {
      code: "fil-PH",
      label: "Filipino",
      available: false,
      selected: false,
    },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("learner speech-language API", () => {
  it("loads catalog availability for the authenticated learner", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json(languageContract));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getLearnerSpeechLanguage("learner-token")).resolves.toEqual(
      languageContract,
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/learners/tts/language",
      expect.objectContaining({
        credentials: "include",
        headers: {
          Accept: "application/json",
          Authorization: "Bearer learner-token",
        },
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("submits only a supported language code", async () => {
    const filipinoContract = {
      speech_language: "fil-PH",
      languages: languageContract.languages.map((language) => ({
        ...language,
        available: true,
        selected: language.code === "fil-PH",
      })),
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json(filipinoContract));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      updateLearnerSpeechLanguage("learner-token", "fil-PH"),
    ).resolves.toEqual(filipinoContract);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/learners/tts/language",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ speech_language: "fil-PH" }),
      }),
    );
  });

  it("surfaces the guarded availability error from the API", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { message: "The Filipino speech catalog is not available yet." },
            { status: 409 },
          ),
        ),
    );

    await expect(
      updateLearnerSpeechLanguage("learner-token", "fil-PH"),
    ).rejects.toThrow("The Filipino speech catalog is not available yet.");
  });
});
