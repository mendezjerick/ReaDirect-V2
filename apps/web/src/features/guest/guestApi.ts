import {
  completeGuestAssessment,
  completeGuestLesson,
  guestSessionSnapshot,
  guestToken,
  isGuestToken,
  loadGuestStore,
  markGuestLessonStarted,
  saveGuestStore,
  setGuestSpeechLanguage,
  updateGuestStore,
  type GuestAssessmentProgress,
  type GuestAssessmentType,
  type GuestGameSave,
  type GuestLessonProgress,
} from "./guestSession";

const assessmentLetters = ["A", "C", "F", "K", "L", "M", "O", "P", "S", "U"];
const assessmentRhymes = [
  ["cat", "hat", "yes"],
  ["sun", "fun", "yes"],
  ["pig", "map", "no"],
  ["bed", "red", "yes"],
  ["cup", "net", "no"],
  ["kid", "bus", "no"],
  ["log", "dog", "yes"],
  ["man", "fan", "yes"],
  ["run", "top", "no"],
  ["hen", "pen", "yes"],
] as const;
const assessmentWords = [
  "bag",
  "cap",
  "gum",
  "hip",
  "lap",
  "mug",
  "nap",
  "pet",
  "sit",
  "tub",
];

const stories = {
  "story:lena-at-park": {
    itemKey: "task-3a-story-1",
    title: "Lena at the Park",
    passage:
      "Lena goes to the park on Sunday, and she takes a ball to play. She holds the ball, rolls it, kicks it, and runs after it. Lena plays with the ball, then she sits, rests, and plays again. She likes to play, and she stays at the park on Sunday.",
    questions: [
      ["who", "Who goes to the park?", "Lena", "Rosa", "Mia", "Ben", "a"],
      [
        "what",
        "What does Lena take?",
        "A pail",
        "A ball",
        "A bag",
        "A book",
        "b",
      ],
      [
        "where",
        "Where does Lena go?",
        "The garden",
        "The market",
        "The park",
        "The school",
        "c",
      ],
      [
        "when",
        "When does Lena go to the park?",
        "On Sunday",
        "On Monday",
        "On Tuesday",
        "On Friday",
        "a",
      ],
      [
        "why",
        "Why does Lena go to the park?",
        "To eat",
        "To sleep",
        "To play",
        "To read",
        "c",
      ],
    ],
  },
  "story:rosa-at-garden": {
    itemKey: "task-3a-story-2",
    title: "Rosa in the Garden",
    passage:
      "Rosa goes to the garden on Monday, and she picks a tomato to eat. She holds the tomato, looks at it, cleans it, and keeps it with her. Rosa walks in the garden, then she rests and looks at it. She eats it, then stays in the garden on Monday.",
    questions: [
      ["who", "Who goes to the garden?", "Lena", "Ben", "Rosa", "Mia", "c"],
      [
        "what",
        "What does Rosa pick?",
        "A ball",
        "A book",
        "A tomato",
        "A seed",
        "c",
      ],
      [
        "where",
        "Where does Rosa go?",
        "The park",
        "The school",
        "The market",
        "The garden",
        "d",
      ],
      [
        "when",
        "When does Rosa go to the garden?",
        "On Sunday",
        "On Tuesday",
        "On Friday",
        "On Monday",
        "d",
      ],
      [
        "why",
        "Why does Rosa go to the garden?",
        "To play",
        "To sleep",
        "To eat",
        "To read",
        "c",
      ],
    ],
  },
} as const;

const lessonDefinitions = {
  1: {
    achievementKey: "reading.letter_leader",
    achievementName: "Letter Leader",
    title: "Letters",
    items: [
      {
        item_key: "guest-letter-a",
        uppercase_form: "A",
        lowercase_form: "a",
        context_word: "Ana",
        highlighted_display: "Ana",
        missing_display: "_na",
      },
      {
        item_key: "guest-letter-b",
        uppercase_form: "B",
        lowercase_form: "b",
        context_word: "bag",
        highlighted_display: "Bag",
        missing_display: "_ag",
      },
      {
        item_key: "guest-letter-c",
        uppercase_form: "C",
        lowercase_form: "c",
        context_word: "cat",
        highlighted_display: "Cat",
        missing_display: "_at",
      },
      {
        item_key: "guest-letter-d",
        uppercase_form: "D",
        lowercase_form: "d",
        context_word: "dog",
        highlighted_display: "Dog",
        missing_display: "_og",
      },
      {
        item_key: "guest-letter-e",
        uppercase_form: "E",
        lowercase_form: "e",
        context_word: "ear",
        highlighted_display: "Ear",
        missing_display: "_ar",
      },
    ],
  },
  2: {
    achievementKey: "reading.word_wizard",
    achievementName: "Word Wizard",
    title: "Words",
    items: ["bag", "bed", "cap", "cat", "dog"].map((word) => ({
      item_key: `guest-word-${word}`,
      presentation: "display_word" as const,
      display_text: word,
    })),
  },
  3: {
    achievementKey: "reading.phrase_pro",
    achievementName: "Phrase Pro",
    title: "Phrases",
    items: ["big bag", "big dog", "fat cat", "red cap", "wet dog"].map(
      (text, index) => ({
        item_key: `guest-phrase-${index + 1}`,
        presentation: "display_phrase" as const,
        display_text: text,
      }),
    ),
  },
  4: {
    achievementKey: "reading.sentence_star",
    achievementName: "Sentence Star",
    title: "Sentences",
    items: [
      "A big bag is on a bed.",
      "A cat is on a mat.",
      "A dog is on a log.",
      "A hen is in a pen.",
      "A kid can hop.",
    ].map((text, index) => ({
      item_key: `guest-sentence-${index + 1}`,
      presentation: "display_sentence" as const,
      display_text: text,
    })),
  },
  5: {
    achievementKey: "reading.passage_explorer",
    achievementName: "Passage Explorer",
    title: "Passage",
    items: [
      {
        item_key: "guest-passage-mila",
        presentation: "display_passage" as const,
        title: "Mila at School",
        display_text:
          "Mila goes to the school on Tuesday, and she takes a book to read. She holds the book, opens it, reads it, and looks at it. Mila reads from the book, then she sits, rests, and reads again. She likes to read, and she stays at the school on Tuesday.",
        authored_pages: [
          "Mila goes to the school on Tuesday, and she takes a book to read. She holds the book, opens it, reads it, and looks at it. Mila reads from the book, then she sits, rests, and reads again. She likes to read, and she stays at the school on Tuesday.",
        ],
        time_limit_seconds: 60 as const,
      },
    ],
  },
} as const;

const lessonSixItems = [
  [
    "who",
    "Lena has a red bag.",
    "Who has a red bag?",
    "Lena",
    "Rosa",
    "Mia",
    "Ben",
    "a",
    "Lena",
  ],
  [
    "what",
    "Mia has a red pen.",
    "What does Mia have?",
    "A red bag",
    "A red pen",
    "A pet cat",
    "A book",
    "b",
    "a red pen",
  ],
  [
    "where",
    "A cat is on a bed.",
    "Where is the cat?",
    "On a mat",
    "In a hut",
    "On a bed",
    "In a box",
    "c",
    "on a bed",
  ],
  [
    "when",
    "Lito can run at noon.",
    "When can Lito run?",
    "At ten",
    "On Monday",
    "At noon",
    "On Friday",
    "c",
    "at noon",
  ],
  [
    "why",
    "Rain made Mila wet.",
    "Why is Mila wet?",
    "A cut",
    "A fall",
    "Rain",
    "A game",
    "c",
    "Rain",
  ],
] as const;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function requestPath(input: RequestInfo | URL): URL {
  const value = input instanceof Request ? input.url : input.toString();
  return new URL(value, globalThis.location?.origin ?? "http://localhost");
}

function authorization(init?: RequestInit): string | null {
  const headers = new Headers(init?.headers);
  return headers.get("Authorization");
}

function requestBody(init?: RequestInit): Record<string, unknown> {
  if (typeof init?.body !== "string") return {};
  try {
    return JSON.parse(init.body) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function assessmentType(path: string): GuestAssessmentType {
  return path.includes("/assessments/final/") ? "final" : "diagnostic";
}

function activityManifest(activity: string) {
  return {
    activity,
    published_groups: [],
    published_speech_keys: [],
    runtime_profiles: [],
    requires_runtime: false,
  };
}

function activityReadiness(activity: string) {
  return {
    activity,
    ready: true,
    published_ready: true,
    published_groups: [],
    voice_version: "guest-published-v1",
    unavailable_speech_keys: [],
    runtime_required: false,
    runtime_ready: true,
    runtime_profiles: [],
    profiles_ready: [],
    device: "browser",
  };
}

function partOneItem(progress: GuestAssessmentProgress) {
  const index = progress.partOneIndex;
  if (progress.partOneStage === "task-1a") {
    const letter = assessmentLetters[index];
    return {
      item_key: `task-1a-${String(index + 1).padStart(2, "0")}`,
      display_text: `${letter} ${letter.toLowerCase()}`,
      uppercase_form: letter,
      lowercase_form: letter.toLowerCase(),
    };
  }
  if (progress.partOneStage === "task-2a") {
    const rhyme = assessmentRhymes[index];
    return {
      item_key: `task-2a-${String(index + 1).padStart(2, "0")}`,
      word_one: rhyme[0],
      word_two: rhyme[1],
    };
  }
  if (progress.partOneStage === "task-2b") {
    return {
      item_key: `task-2b-${String(index + 1).padStart(2, "0")}`,
      display_text: assessmentWords[index],
    };
  }
  return null;
}

function partOneResult(progress: GuestAssessmentProgress) {
  return {
    score: Math.min(30, progress.partOneScore),
    maximum: 30,
    level: progress.partOneScore >= 24 ? "Strong Start" : "Ready to Learn",
    branch: progress.partOneScore >= 24 ? "high" : "low",
    segments: [
      {
        task: "Letters",
        score: Math.min(10, progress.partOneScore),
        maximum: 10,
        status: "administered",
      },
      {
        task: "Rhymes",
        score: Math.min(10, Math.max(0, progress.partOneScore - 10)),
        maximum: 10,
        status: "administered",
      },
      {
        task: "Words",
        score: Math.min(10, Math.max(0, progress.partOneScore - 20)),
        maximum: 10,
        status: "administered",
      },
    ],
    continues_to_part_two: true,
  };
}

function partOneState(
  type: GuestAssessmentType,
  progress: GuestAssessmentProgress,
) {
  const active = !["orientation", "part-1-results"].includes(
    progress.partOneStage,
  );
  return {
    run_id: progress.runId,
    assessment_type: type,
    stage: progress.partOneStage,
    orientation_ready: progress.partOneStage !== "orientation",
    progress: active
      ? {
          current: progress.partOneIndex + 1,
          total: 10,
          completed: progress.partOneIndex,
        }
      : null,
    item: partOneItem(progress),
    response_committed: false,
    result:
      progress.partOneStage === "part-1-results"
        ? partOneResult(progress)
        : null,
  };
}

function advancePartOne(progress: GuestAssessmentProgress, scored: boolean) {
  const next = {
    ...progress,
    partOneScore: progress.partOneScore + (scored ? 1 : 0),
  };
  if (progress.partOneStage === "orientation") {
    next.partOneStage = "task-1a";
    next.partOneIndex = 0;
    return next;
  }
  if (progress.partOneIndex < 9) {
    next.partOneIndex += 1;
    return next;
  }
  next.partOneIndex = 0;
  next.partOneStage =
    progress.partOneStage === "task-1a"
      ? "task-2a"
      : progress.partOneStage === "task-2a"
        ? "task-2b"
        : "part-1-results";
  return next;
}

function selectedStory(progress: GuestAssessmentProgress) {
  return (
    stories[progress.selectedStoryKey as keyof typeof stories] ??
    stories["story:lena-at-park"]
  );
}

function passageReview(progress: GuestAssessmentProgress) {
  const story = selectedStory(progress);
  const correct = progress.passageScore > 0;
  return {
    title: story.title,
    skipped: !correct,
    review_available: true,
    reading_seconds: correct ? 45 : null,
    words_per_minute: correct ? 67 : null,
    correct_words_per_minute: correct ? 63 : null,
    words: story.passage.split(/\s+/).map((text) => ({
      text,
      status: correct ? "correct" : "unscored",
      heard: correct ? text : null,
    })),
    extra_words: [],
  };
}

function partTwoResult(progress: GuestAssessmentProgress) {
  const accuracy = progress.passageScore > 0 ? 94 : 0;
  const comprehensionPercent = progress.comprehensionScore * 20;
  return {
    score: Math.round((accuracy + comprehensionPercent) / 2),
    maximum: 100,
    profile: comprehensionPercent >= 80 ? "Growing Reader" : "Building Skills",
    reading_accuracy_percent: accuracy,
    comprehension_percent: comprehensionPercent,
    comprehension_score: progress.comprehensionScore,
    passage_review: passageReview(progress),
  };
}

function partTwoState(
  type: GuestAssessmentType,
  progress: GuestAssessmentProgress,
) {
  const story = selectedStory(progress);
  const question = story.questions[progress.comprehensionIndex];
  const item =
    progress.partTwoStage === "task-3a"
      ? {
          item_key: story.itemKey,
          kind: "passage",
          title: story.title,
          display_text: story.passage,
          authored_pages: [story.passage],
          time_limit_seconds: 60,
        }
      : progress.partTwoStage === "task-3b"
        ? {
            item_key: `guest-question-${progress.comprehensionIndex + 1}`,
            kind: "comprehension",
            question_type: question[0],
            question_text: question[1],
            choices: (["a", "b", "c", "d"] as const).map((key, index) => ({
              key,
              text: question[index + 2] as string,
            })),
          }
        : null;
  const resultStages = [
    "passage-results",
    "part-2-results",
    "assessment-complete",
  ];
  const allAchievements = [
    "reading.ready_reader",
    "reading.letter_leader",
    "reading.word_wizard",
    "reading.phrase_pro",
    "reading.sentence_star",
    "reading.passage_explorer",
    "reading.question_detective",
    "reading.readirect_champion",
  ];
  return {
    run_id: progress.runId,
    assessment_type: type,
    stage: progress.partTwoStage,
    selected_story_key: progress.selectedStoryKey,
    progress:
      progress.partTwoStage === "task-3b"
        ? {
            current: progress.comprehensionIndex + 1,
            total: 5,
            completed: progress.comprehensionIndex,
          }
        : progress.partTwoStage === "task-3a"
          ? { current: 1, total: 1, completed: 0 }
          : null,
    story_choices: [
      { story_key: "story:lena-at-park", title: "Lena at the Park" },
      { story_key: "story:rosa-at-garden", title: "Rosa in the Garden" },
    ],
    item,
    result: resultStages.includes(progress.partTwoStage)
      ? partTwoResult(progress)
      : null,
    completion:
      progress.partTwoStage === "assessment-complete"
        ? {
            kind: type === "final" ? "reading-journey-finale" : "diagnostic",
            title:
              type === "final"
                ? "Reading Journey Complete"
                : "Diagnostic Complete",
            message:
              type === "final"
                ? "You finished your Reading Journey. Keep reading and growing!"
                : "Your first reading lesson is ready.",
            achievement_keys:
              type === "final" ? allAchievements : ["reading.ready_reader"],
          }
        : null,
  };
}

function emptyPracticeTries() {
  return { count: 0, entries: [] };
}

function lessonSupport(progress: GuestLessonProgress, lessonNumber: number) {
  const itemPosition = progress.itemIndex + 1;
  const speechKey =
    progress.status === "completed"
      ? `lesson-${lessonNumber}-complete`
      : progress.response === null
        ? itemPosition === 1
          ? `lesson-${lessonNumber}-mission-1`
          : `lesson-${lessonNumber}-mission-1-item-${itemPosition}`
        : progress.response === "correct"
          ? lessonNumber === 5
            ? "lesson-5-performance-strong"
            : `lesson-${lessonNumber}-feedback-independent`
          : progress.response === "incorrect"
            ? lessonNumber === 5
              ? "lesson-5-performance-beginning"
              : `lesson-${lessonNumber}-feedback-not-yet`
            : lessonNumber === 5
              ? "lesson-5-performance-skipped"
              : null;
  return {
    sequence_key: `guest-lesson-${lessonNumber}-${progress.itemIndex}-${progress.response ?? "start"}-${progress.status}`,
    speech:
      progress.status === "active" &&
      progress.response === "incorrect" &&
      lessonNumber <= 4
        ? [
            {
              kind: "runtime_feedback",
              response_id: progress.runId * 100 + progress.itemIndex + 1,
            },
          ]
        : speechKey
          ? [{ kind: "published", speech_key: speechKey }]
          : [],
    display_mode:
      progress.status === "completed"
        ? "completion"
        : progress.response
          ? "feedback"
          : "instruction",
    after_speech: "none",
    requires_speech_completion: false,
  };
}

function lessonTeaching(progress: GuestLessonProgress) {
  const responded = progress.response !== null;
  return {
    state: responded ? "ADVANCING" : "LISTENING",
    outcome:
      progress.response === "correct"
        ? "INDEPENDENT_CORRECT"
        : progress.response === "skipped"
          ? "SKIPPED"
          : progress.response === "incorrect"
            ? "NOT_YET_CORRECT"
            : null,
    academic_attempt_count: responded ? 1 : 0,
    technical_retry_count: 0,
    highest_scaffold_used: "none",
    independent_mastery: progress.response === "correct",
    diagnosis_key:
      progress.response === "incorrect" ? "guest_local_mismatch" : null,
    review_recommended: progress.response === "incorrect",
    can_record: !responded,
    can_continue_support: false,
    can_advance: responded,
  };
}

function lessonResponse(progress: GuestLessonProgress) {
  if (!progress.response) return null;
  return {
    id: progress.runId * 100 + progress.itemIndex + 1,
    decision:
      progress.response === "correct"
        ? "CORRECT"
        : progress.response === "skipped"
          ? "SKIPPED"
          : "NEEDS_SUPPORT",
    final_transcript: progress.finalTranscript,
    response_type: progress.response === "skipped" ? "skipped" : "speech",
    outcome:
      progress.response === "correct"
        ? "INDEPENDENT_CORRECT"
        : progress.response === "skipped"
          ? "SKIPPED"
          : "NOT_YET_CORRECT",
    academic_attempt_count: 1,
    technical_retry_count: 0,
    highest_scaffold_used: "none",
    independent_mastery: progress.response === "correct",
    diagnosis_key:
      progress.response === "incorrect" ? "guest_local_mismatch" : null,
    review_recommended: progress.response === "incorrect",
    attempt_count: 1,
  };
}

function lessonCompletion(lessonNumber: number) {
  const definition =
    lessonDefinitions[lessonNumber as keyof typeof lessonDefinitions];
  const store = loadGuestStore();
  const completedLessonCount =
    store?.readingPath.completed_lesson_count ?? lessonNumber;
  return {
    title:
      completedLessonCount === 6
        ? "Final Assessment Ready"
        : `Lesson ${lessonNumber} Complete`,
    message: "Your progress was saved on this device.",
    achievement_key: definition.achievementKey,
    achievement_name: definition.achievementName,
    completed_lesson_count: completedLessonCount,
    final_assessment_ready: completedLessonCount === 6,
    score: definition.items.length,
    maximum: definition.items.length,
    segments: [
      {
        mission_key: "mission-1",
        label: definition.title,
        score: definition.items.length,
        maximum: definition.items.length,
        status: "Complete",
      },
    ],
    lessons: [1, 2, 3, 4, 5, 6].map((lesson) => ({
      lesson,
      complete:
        store?.readingPath.lessons.some(
          (entry) => entry.order === lesson && entry.status === "completed",
        ) ?? false,
    })),
  };
}

function buildLessonState(
  lessonNumber: 1 | 2 | 3 | 4 | 5,
  progress: GuestLessonProgress,
) {
  const definition = lessonDefinitions[lessonNumber];
  const item =
    progress.status === "active"
      ? (definition.items[progress.itemIndex] ?? null)
      : null;
  const base = {
    run_id: progress.runId,
    lesson_key: `required-lesson-${lessonNumber}`,
    content_version: "guest-v1",
    status: progress.status,
    mission: {
      key: "mission-1",
      number: 1,
      total: lessonNumber === 2 ? 2 : lessonNumber === 1 ? 3 : 1,
      title: `Lesson ${lessonNumber}`,
    },
    progress: {
      current: Math.min(progress.itemIndex + 1, definition.items.length),
      total: definition.items.length,
    },
    item,
    response: lessonResponse(progress),
    teaching: lessonTeaching(progress),
    support: lessonSupport(progress, lessonNumber),
    practice_tries: emptyPracticeTries(),
    completion:
      progress.status === "completed" ? lessonCompletion(lessonNumber) : null,
  };
  if (lessonNumber === 5) {
    return {
      ...base,
      passage_review:
        progress.status === "review" || progress.status === "completed"
          ? {
              title: "Mila at School",
              skipped: progress.response === "skipped",
              review_available: true,
              performance_band:
                progress.response === "correct" ? "strong" : "beginning",
              reading_accuracy_percent:
                progress.response === "correct" ? 94 : 0,
              reading_seconds: progress.response === "correct" ? 45 : null,
              words_per_minute: progress.response === "correct" ? 67 : null,
              correct_words_per_minute:
                progress.response === "correct" ? 63 : null,
              words: lessonDefinitions[5].items[0].display_text
                .split(/\s+/)
                .map((text) => ({
                  text,
                  status:
                    progress.response === "correct" ? "correct" : "unscored",
                  heard: progress.response === "correct" ? text : null,
                })),
              extra_words: [],
            }
          : null,
    };
  }
  return base;
}

function buildLessonSixState(progress: GuestLessonProgress) {
  const item = lessonSixItems[progress.itemIndex];
  const responded = progress.response !== null;
  const store = loadGuestStore();
  const speechSlugs = [
    "who-lena",
    "what-mia",
    "where-cat",
    "when-lito",
    "why-mila",
  ] as const;
  const speechSlug = speechSlugs[progress.itemIndex] ?? speechSlugs[0];
  const speechKey =
    progress.status === "completed"
      ? "lesson-6-complete"
      : responded
        ? progress.response === "correct"
          ? `lesson-6-correct-${speechSlug}`
          : `lesson-6-demo-${speechSlug}`
        : `lesson-6-question-${speechSlug}`;
  return {
    run_id: progress.runId,
    lesson_key: "required-lesson-6",
    content_version: "guest-v1",
    status: progress.status,
    mission: {
      key: "mission-1",
      number: 1,
      total: 1,
      title: "Understand the sentence",
    },
    progress: { current: Math.min(progress.itemIndex + 1, 5), total: 5 },
    item:
      progress.status === "active" && item
        ? {
            item_key: `guest-comprehension-${progress.itemIndex + 1}`,
            question_type: item[0],
            display_sentence: item[1],
            question_text: item[2],
            choices: (["a", "b", "c", "d"] as const).map((key, index) => ({
              key,
              text: item[index + 3] as string,
            })),
            evidence_span: responded ? item[8] : null,
            correct_choice_key: responded ? item[7] : null,
          }
        : null,
    response: responded
      ? {
          id: progress.runId * 100 + progress.itemIndex + 1,
          decision:
            progress.response === "correct"
              ? "CORRECT"
              : progress.response === "skipped"
                ? "SKIPPED"
                : "NEEDS_SUPPORT",
          outcome:
            progress.response === "correct"
              ? "INDEPENDENT_CORRECT"
              : progress.response === "skipped"
                ? "SKIPPED"
                : "DEMONSTRATED",
          attempt_count: 1,
          wrong_choice_count: progress.response === "incorrect" ? 1 : 0,
          assistance_level:
            progress.response === "incorrect" ? "demonstration" : "none",
          disabled_choices: [],
          last_selected_choice: null,
        }
      : null,
    teaching: {
      can_choose: !responded,
      can_advance: responded,
      assistance_level:
        progress.response === "incorrect" ? "demonstration" : "none",
      show_evidence: responded,
      show_correct_choice: responded,
    },
    support: {
      sequence_key: `guest-lesson-6-${progress.itemIndex}-${progress.response ?? "start"}`,
      speech_key: speechKey,
      speech_keys: [speechKey],
      requires_speech_completion: false,
    },
    completion:
      progress.status === "completed"
        ? {
            title: "Final Assessment Ready",
            message: "You completed all six lessons.",
            achievement_key: "reading.question_detective",
            achievement_name: "Question Detective",
            completed_lesson_count:
              store?.readingPath.completed_lesson_count ?? 6,
            final_assessment_ready: true,
            resolved_count: 5,
            total: 5,
            lessons: [1, 2, 3, 4, 5, 6].map((lesson) => ({
              lesson,
              complete: true,
            })),
          }
        : null,
  };
}

function ensureLesson(
  lessonNumber: 1 | 2 | 3 | 4 | 5 | 6,
): GuestLessonProgress {
  const key = String(lessonNumber);
  const current = loadGuestStore();
  const existing = current?.lessons[key];
  if (existing) return existing;
  const created: GuestLessonProgress = {
    runId: 100 + lessonNumber,
    itemIndex: 0,
    response: null,
    finalTranscript: null,
    status: "active",
  };
  updateGuestStore((store) => ({
    ...store,
    lessons: { ...store.lessons, [key]: created },
  }));
  markGuestLessonStarted(lessonNumber);
  return created;
}

function updateLesson(
  lessonNumber: 1 | 2 | 3 | 4 | 5 | 6,
  update: (progress: GuestLessonProgress) => GuestLessonProgress,
) {
  const key = String(lessonNumber);
  const store = updateGuestStore((current) => ({
    ...current,
    lessons: {
      ...current.lessons,
      [key]: update(current.lessons[key] ?? ensureLesson(lessonNumber)),
    },
  }));
  return store.lessons[key];
}

function lessonTarget(
  lessonNumber: number,
  progress: GuestLessonProgress,
): string {
  if (lessonNumber === 1)
    return (
      lessonDefinitions[1].items[progress.itemIndex]?.uppercase_form ?? "A"
    );
  if (lessonNumber === 2)
    return (
      lessonDefinitions[2].items[progress.itemIndex]?.display_text ?? "bag"
    );
  if (lessonNumber === 3)
    return (
      lessonDefinitions[3].items[progress.itemIndex]?.display_text ?? "big bag"
    );
  if (lessonNumber === 4)
    return (
      lessonDefinitions[4].items[progress.itemIndex]?.display_text ??
      "A cat is on a mat."
    );
  return lessonDefinitions[5].items[0].display_text;
}

function mediaUrl(input: RequestInfo | URL, path: string): string {
  const source = requestPath(input);
  source.pathname = path;
  source.search = "";
  return source.toString();
}

async function evaluateSpeech(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  mode: "orientation" | "letter" | "word" | "phrase" | "passage",
  target: string,
): Promise<{ correct: boolean; transcript: string; usable: boolean }> {
  if (!(init?.body instanceof FormData)) {
    return { correct: false, transcript: "", usable: false };
  }
  const audio = init.body.get("audio");
  if (!(audio instanceof Blob)) {
    return { correct: false, transcript: "", usable: false };
  }
  const form = new FormData();
  form.append("mode", mode);
  form.append("target", target);
  form.append("audio", audio, "guest-reading.webm");
  const response = await globalThis.fetch(
    mediaUrl(input, "/api/guest/speech/evaluate"),
    {
      method: "POST",
      headers: { Accept: "application/json" },
      body: form,
      credentials: "include",
      signal: init.signal,
    },
  );
  const body = (await response.json().catch(() => null)) as {
    correct?: boolean;
    transcript?: string;
    usable?: boolean;
    message?: string;
  } | null;
  if (!response.ok) {
    throw new Error(
      body?.message ?? "The reading checker could not process that recording.",
    );
  }
  return {
    correct: body?.correct === true,
    transcript: body?.transcript ?? "",
    usable: body?.usable !== false,
  };
}

async function handleAssessment(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  url: URL,
): Promise<Response> {
  const type = assessmentType(url.pathname);
  let store = loadGuestStore()!;
  let progress = store.assessments[type];
  const path = url.pathname;

  if (path.endsWith("/part-one/start")) {
    if (
      type === "diagnostic" &&
      store.readingPath.diagnostic.status === "required"
    ) {
      store.readingPath.diagnostic.status = "in_progress";
    }
    if (
      type === "final" &&
      store.readingPath.final_assessment.status === "available"
    ) {
      store.readingPath.final_assessment.status = "in_progress";
    }
    saveGuestStore(store);
    return json(partOneState(type, progress));
  }

  if (path.includes("/part-one/") && path.endsWith("/orientation")) {
    const result = await evaluateSpeech(input, init, "orientation", "ready");
    if (!result.usable)
      return json(
        { message: "We could not hear that clearly. Try once more." },
        422,
      );
    progress = advancePartOne(progress, false);
  } else if (path.includes("/part-one/") && path.endsWith("/speech")) {
    const target =
      progress.partOneStage === "task-1a"
        ? assessmentLetters[progress.partOneIndex]
        : assessmentWords[progress.partOneIndex];
    const result = await evaluateSpeech(
      input,
      init,
      progress.partOneStage === "task-1a" ? "letter" : "word",
      target,
    );
    progress = advancePartOne(progress, result.correct);
  } else if (path.includes("/part-one/") && path.endsWith("/rhyme")) {
    const choice = requestBody(init).choice;
    progress = advancePartOne(
      progress,
      choice === assessmentRhymes[progress.partOneIndex][2],
    );
  } else if (path.includes("/part-one/") && path.endsWith("/skip")) {
    progress = advancePartOne(progress, false);
  } else if (path.includes("/part-one/") && path.endsWith("/advance")) {
    return json(partOneState(type, progress));
  } else if (path.includes("/part-one/") && path.endsWith("/continue")) {
    return json({
      run_id: progress.runId,
      next_route:
        type === "final"
          ? "/learner/final-assessment/part-two"
          : "/learner/assessment/part-two",
    });
  } else if (path.endsWith("/part-two/current")) {
    return json(partTwoState(type, progress));
  } else if (path.includes("/part-two/") && path.endsWith("/story")) {
    const storyKey = requestBody(init).story_key;
    if (typeof storyKey === "string" && storyKey in stories) {
      progress = {
        ...progress,
        selectedStoryKey: storyKey,
        partTwoStage: "task-3a",
      };
    }
  } else if (path.includes("/part-two/") && path.endsWith("/passage")) {
    const story = selectedStory(progress);
    const result = await evaluateSpeech(input, init, "passage", story.passage);
    progress = {
      ...progress,
      passageScore: result.correct ? 50 : 0,
      partTwoStage: "passage-results",
    };
  } else if (path.includes("/part-two/") && path.endsWith("/comprehension")) {
    const choice = requestBody(init).choice;
    const correct =
      selectedStory(progress).questions[progress.comprehensionIndex][6];
    const nextScore =
      progress.comprehensionScore + (choice === correct ? 1 : 0);
    progress =
      progress.comprehensionIndex >= 4
        ? {
            ...progress,
            comprehensionScore: nextScore,
            partTwoStage: "part-2-results",
          }
        : {
            ...progress,
            comprehensionScore: nextScore,
            comprehensionIndex: progress.comprehensionIndex + 1,
          };
  } else if (path.includes("/part-two/") && path.endsWith("/skip")) {
    if (progress.partTwoStage === "task-3a") {
      progress = {
        ...progress,
        passageScore: 0,
        partTwoStage: "passage-results",
      };
    } else {
      progress =
        progress.comprehensionIndex >= 4
          ? { ...progress, partTwoStage: "part-2-results" }
          : {
              ...progress,
              comprehensionIndex: progress.comprehensionIndex + 1,
            };
    }
  } else if (path.includes("/part-two/") && path.endsWith("/continue")) {
    progress =
      progress.partTwoStage === "passage-results"
        ? { ...progress, partTwoStage: "task-3b", comprehensionIndex: 0 }
        : { ...progress, partTwoStage: "assessment-complete" };
  } else if (path.includes("/part-two/") && path.endsWith("/finish")) {
    const score = Math.min(
      100,
      Math.round(
        (progress.partOneScore / 30) * 50 +
          progress.passageScore / 2 +
          progress.comprehensionScore * 5,
      ),
    );
    completeGuestAssessment(type, score);
    return json({ completed: true, next_route: "/learner/dashboard" });
  }

  store = loadGuestStore()!;
  store.assessments[type] = progress;
  saveGuestStore(store);
  return json(
    path.includes("/part-two/")
      ? partTwoState(type, progress)
      : partOneState(type, progress),
  );
}

async function handleLesson(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  url: URL,
): Promise<Response> {
  const match = url.pathname.match(/\/lessons\/lesson-(\d)/);
  const lessonNumber = Number(match?.[1]) as 1 | 2 | 3 | 4 | 5 | 6;
  let progress = ensureLesson(lessonNumber);

  if (url.pathname.endsWith("/start") || init?.method === "GET") {
    return json(
      lessonNumber === 6
        ? buildLessonSixState(progress)
        : buildLessonState(lessonNumber, progress),
    );
  }

  if (url.pathname.endsWith("/submit")) {
    if (lessonNumber === 6) {
      const choice = requestBody(init).choice;
      const correct = lessonSixItems[progress.itemIndex]?.[7];
      progress = updateLesson(lessonNumber, (current) => ({
        ...current,
        response: choice === correct ? "correct" : "incorrect",
      }));
    } else {
      const mode =
        lessonNumber === 1
          ? "letter"
          : lessonNumber === 2
            ? "word"
            : lessonNumber === 5
              ? "passage"
              : "phrase";
      const result = await evaluateSpeech(
        input,
        init,
        mode,
        lessonTarget(lessonNumber, progress),
      );
      progress = updateLesson(lessonNumber, (current) => ({
        ...current,
        response: result.correct ? "correct" : "incorrect",
        finalTranscript: result.transcript,
        status: lessonNumber === 5 ? "review" : current.status,
      }));
    }
  } else if (url.pathname.endsWith("/skip")) {
    progress = updateLesson(lessonNumber, (current) => ({
      ...current,
      response: "skipped",
      finalTranscript: null,
      status: lessonNumber === 5 ? "review" : current.status,
    }));
  } else if (url.pathname.endsWith("/continue-support")) {
    return json(
      lessonNumber === 6
        ? buildLessonSixState(progress)
        : buildLessonState(lessonNumber, progress),
    );
  } else if (url.pathname.endsWith("/continue-review")) {
    progress = updateLesson(lessonNumber, (current) => ({
      ...current,
      status: "completed",
    }));
    const definition = lessonDefinitions[5];
    completeGuestLesson(5, definition.achievementKey);
  } else if (url.pathname.endsWith("/advance")) {
    const total =
      lessonNumber === 6 ? 5 : lessonDefinitions[lessonNumber].items.length;
    if (progress.itemIndex + 1 >= total) {
      progress = updateLesson(lessonNumber, (current) => ({
        ...current,
        status: "completed",
        response: null,
      }));
      const achievementKey =
        lessonNumber === 6
          ? "reading.question_detective"
          : lessonDefinitions[lessonNumber].achievementKey;
      completeGuestLesson(lessonNumber, achievementKey);
    } else {
      progress = updateLesson(lessonNumber, (current) => ({
        ...current,
        itemIndex: current.itemIndex + 1,
        response: null,
        finalTranscript: null,
      }));
    }
  }

  return json(
    lessonNumber === 6
      ? buildLessonSixState(progress)
      : buildLessonState(lessonNumber, progress),
  );
}

function gameSaveResponse(gameKey: string, save: GuestGameSave | null) {
  return {
    game_key: gameKey,
    save: save
      ? {
          checkpoint_key: save.checkpointKey,
          save_schema_version: save.saveSchemaVersion,
          state: save.state,
          revision: save.revision,
          saved_at: save.savedAt,
        }
      : null,
  };
}

function handleGames(url: URL, init?: RequestInit): Response {
  const store = loadGuestStore()!;
  if (url.pathname.endsWith("/games/profile")) {
    if ((init?.method ?? "GET") === "POST") {
      const username =
        String(requestBody(init).username ?? "Guest")
          .trim()
          .slice(0, 10) || "Guest";
      const profile = {
        audience: "learner" as const,
        username,
        discriminator: "0000",
        publicHandle: `${username}#0000`,
        isActive: true,
      };
      store.gameProfile = profile;
      saveGuestStore(store);
      return json({
        profile: {
          audience: profile.audience,
          username: profile.username,
          discriminator: profile.discriminator,
          public_handle: profile.publicHandle,
          is_active: profile.isActive,
        },
      });
    }
    const profile = store.gameProfile;
    return json({
      profile: profile
        ? {
            audience: profile.audience,
            username: profile.username,
            discriminator: profile.discriminator,
            public_handle: profile.publicHandle,
            is_active: profile.isActive,
          }
        : null,
    });
  }

  const match = url.pathname.match(/\/games\/([^/]+)\/(save|new-game)$/);
  const gameKey = match?.[1] ?? "game";
  if (match?.[2] === "new-game") {
    delete store.gameSaves[gameKey];
    saveGuestStore(store);
    return json(gameSaveResponse(gameKey, null));
  }
  if ((init?.method ?? "GET") === "PUT") {
    const body = requestBody(init);
    const previous = store.gameSaves[gameKey];
    const save: GuestGameSave = {
      checkpointKey: String(body.checkpoint_key ?? "start"),
      saveSchemaVersion: Number(body.save_schema_version ?? 1),
      state: (body.state && typeof body.state === "object"
        ? body.state
        : {}) as Record<string, unknown>,
      revision: (previous?.revision ?? 0) + 1,
      savedAt: new Date().toISOString(),
    };
    store.gameSaves[gameKey] = save;
    saveGuestStore(store);
    return json(gameSaveResponse(gameKey, save));
  }
  return json(gameSaveResponse(gameKey, store.gameSaves[gameKey] ?? null));
}

async function guestLessonFeedback(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  url: URL,
): Promise<Response> {
  const store = loadGuestStore();
  const responseId = Number(url.pathname.split("/").pop());
  const entry = Object.entries(store?.lessons ?? {}).find(
    ([key, progress]) =>
      Number(key) >= 1 &&
      Number(key) <= 4 &&
      progress.status === "active" &&
      progress.response === "incorrect" &&
      progress.runId * 100 + progress.itemIndex + 1 === responseId,
  );
  if (!entry)
    return json(
      { message: "That guest response is no longer available." },
      404,
    );
  const [lesson, progress] = entry;
  const language = store?.speechLanguage ?? "en";
  // Keep fallback within the caller's existing timeout; never send the local token.
  const controller = new AbortController();
  const abort = () => controller.abort(init?.signal?.reason);
  if (init?.signal?.aborted) abort();
  else init?.signal?.addEventListener("abort", abort, { once: true });
  const timeout = globalThis.setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await globalThis.fetch(
      mediaUrl(input, "/api/guest/tts/lesson-feedback"),
      {
        method: "POST",
        headers: { Accept: "audio/wav", "Content-Type": "application/json" },
        body: JSON.stringify({
          lesson: Number(lesson),
          transcript: progress.finalTranscript,
          language,
        }),
        credentials: "include",
        signal: controller.signal,
      },
    );
    if (response.ok) return response;
  } catch (error) {
    if (init?.signal?.aborted) throw error;
  } finally {
    globalThis.clearTimeout(timeout);
    init?.signal?.removeEventListener("abort", abort);
  }
  init?.signal?.throwIfAborted();
  return globalThis.fetch(
    mediaUrl(input, `/api/guest/tts/speech/lesson-${lesson}-feedback-not-yet`) +
      `?language=${encodeURIComponent(language)}`,
    {
      method: "POST",
      headers: { Accept: "audio/wav" },
      credentials: "include",
      signal: init?.signal,
    },
  );
}

export function maybeHandleGuestApiRequest(
  input: RequestInfo | URL,
  init?: RequestInit,
): Response | Promise<Response> | null {
  if (
    authorization(init) !== `Bearer ${guestToken}` ||
    !isGuestToken(guestToken)
  ) {
    return null;
  }

  const url = requestPath(input);
  if (!url.pathname.startsWith("/api/learners/")) return null;

  if (url.pathname.startsWith("/api/learners/tts/lesson-feedback/")) {
    return guestLessonFeedback(input, init, url);
  }

  if (url.pathname.includes("/assessments/")) {
    return handleAssessment(input, init, url);
  }
  if (url.pathname.includes("/lessons/lesson-")) {
    return handleLesson(input, init, url);
  }
  if (url.pathname.includes("/games/")) {
    return handleGames(url, init);
  }
  if (url.pathname.endsWith("/tts/activity-manifest")) {
    return json(activityManifest(url.searchParams.get("activity") ?? "guest"));
  }
  if (url.pathname.endsWith("/tts/activity-readiness")) {
    return json(
      activityReadiness(String(requestBody(init).activity ?? "guest")),
    );
  }
  if (url.pathname.includes("/tts/speech/")) {
    const speechKey = url.pathname.split("/").pop() ?? "";
    const language = loadGuestStore()?.speechLanguage ?? "en";
    return globalThis.fetch(
      mediaUrl(
        input,
        `/api/guest/tts/speech/${encodeURIComponent(speechKey)}`,
      ) + `?language=${encodeURIComponent(language)}`,
      {
        method: "POST",
        headers: { Accept: "audio/wav" },
        signal: init?.signal,
        credentials: "include",
      },
    );
  }

  return null;
}

export function guestSessionResponse() {
  return guestSessionSnapshot();
}

export function guestLanguageContract() {
  const language = loadGuestStore()?.speechLanguage ?? "en";
  return {
    speech_language: language,
    languages: [
      {
        code: "en",
        label: "English",
        available: true,
        selected: language === "en",
      },
      {
        code: "fil-PH",
        label: "Filipino",
        available: true,
        selected: language === "fil-PH",
      },
    ],
  };
}

export function updateGuestLanguage(language: "en" | "fil-PH") {
  setGuestSpeechLanguage(language);
  return guestLanguageContract();
}
