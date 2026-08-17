import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const repositoryRoot = path.resolve(webRoot, "../..");
const outputPath = path.join(
  webRoot,
  "src/apk/content/offlineJourneyContent.generated.json",
);
const ttsManifestPath = path.join(
  repositoryRoot,
  "services/tts/offline_catalog/artifacts.json",
);
const refresh = process.argv.includes("--refresh-manifest");

function parseCsv(source) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        value += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(value);
      value = "";
    } else if (character === "\n") {
      row.push(value.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value.replace(/\r$/, ""));
    rows.push(row);
  }

  const [headers, ...values] = rows;
  return values
    .filter((candidate) => candidate.length === headers.length)
    .map((candidate) =>
      Object.fromEntries(
        headers.map((header, index) => [header, candidate[index]]),
      ),
    )
    .filter((candidate) => candidate.status === "active");
}

async function readRows(relativePath) {
  return parseCsv(
    await readFile(path.join(repositoryRoot, relativePath), "utf8"),
  );
}

function numberedTtsKey(base, position) {
  return position === 1 ? base : `${base}-item-${position}`;
}

function speechItem({
  key,
  phase,
  prompt,
  display,
  expected,
  ttsKey,
  long = false,
}) {
  return {
    key,
    phase,
    kind: "speech",
    prompt,
    display,
    expected,
    ttsKey,
    long,
  };
}

function choiceItem({
  key,
  phase,
  prompt,
  display,
  choices,
  correctChoice,
  ttsKey,
}) {
  return {
    key,
    phase,
    kind: "choice",
    prompt,
    display,
    choices,
    correctChoice,
    ttsKey,
  };
}

function buildAssessment(
  { letters, rhymes, words, passages, comprehension },
  variant,
) {
  const storyIndex = variant === "diagnostic" ? 0 : 1;
  const passage = passages[storyIndex];
  const storyRows = comprehension
    .filter((row) => row.story_key === passage.story_key)
    .slice(0, 5);
  const storyName = passage.title.split(" ")[0].toLowerCase();
  return {
    key: variant,
    title:
      variant === "diagnostic" ? "Diagnostic Assessment" : "Final Assessment",
    completionTtsKey:
      variant === "diagnostic"
        ? "assessment-complete"
        : "assessment-final-complete",
    items: [
      ...letters.slice(0, 10).map((row, index) =>
        speechItem({
          key: `${variant}-${row.item_key}`,
          phase: "Letters",
          prompt: "Say the letter.",
          display: `${row.uppercase_form} ${row.lowercase_form}`,
          expected: row.spoken_target,
          ttsKey: numberedTtsKey("assessment-letters", index + 1),
        }),
      ),
      ...rhymes.slice(0, 10).map((row, index) =>
        choiceItem({
          key: `${variant}-${row.item_key}`,
          phase: "Rhyming Words",
          prompt: "Do these words rhyme?",
          display: `${row.word_one} — ${row.word_two}`,
          choices: [
            { key: "yes", label: "Yes" },
            { key: "no", label: "No" },
          ],
          correctChoice: row.correct_response,
          ttsKey: numberedTtsKey("assessment-rhymes", index + 1),
        }),
      ),
      ...words.slice(0, 10).map((row, index) =>
        speechItem({
          key: `${variant}-${row.item_key}`,
          phase: "Words",
          prompt: "Read the word.",
          display: row.display_text,
          expected: row.spoken_target,
          ttsKey: numberedTtsKey("assessment-words", index + 1),
        }),
      ),
      speechItem({
        key: `${variant}-${passage.item_key}`,
        phase: "Passage",
        prompt: "Read the passage aloud.",
        display: passage.display_text,
        expected: passage.spoken_target,
        ttsKey: "assessment-passage",
        long: true,
      }),
      ...storyRows.map((row, index) =>
        choiceItem({
          key: `${variant}-${row.item_key}`,
          phase: "Comprehension",
          prompt: row.question_text,
          display: passage.title,
          choices: ["a", "b", "c", "d"].map((key) => ({
            key,
            label: row[`choice_${key}`],
          })),
          correctChoice: row.correct_choice_key,
          ttsKey: `assessment-comprehension-${storyName}-item-${index + 1}`,
        }),
      ),
    ],
  };
}

function lessonSpeechItems(rows, lesson, mission, options) {
  return rows.map((row, index) =>
    speechItem({
      key: `lesson-${lesson}-${mission}-${index + 1}`,
      phase: options.phase,
      prompt: options.prompt,
      display: options.display(row),
      expected: options.expected(row),
      ttsKey: numberedTtsKey(`lesson-${lesson}-${mission}`, index + 1),
      long: options.long ?? false,
    }),
  );
}

const [letters, words, phrases, sentences, passages, comprehension] =
  await Promise.all([
    readRows("content/lessons/v1/lesson-1-letter-items.csv"),
    readRows("content/lessons/v1/lesson-2-word-items.csv"),
    readRows("content/lessons/v1/lesson-3-phrases.csv"),
    readRows("content/lessons/v1/lesson-4-sentences.csv"),
    readRows("content/lessons/v1/lesson-5-passages.csv"),
    readRows("content/lessons/v1/lesson-6-comprehension.csv"),
  ]);
const assessmentRows = {
  letters: await readRows("content/assessments/v1/shared/task-1a-letters.csv"),
  rhymes: await readRows("content/assessments/v1/shared/task-2a-rhymes.csv"),
  words: await readRows("content/assessments/v1/shared/task-2b-words.csv"),
  passages: await readRows(
    "content/assessments/v1/shared/task-3a-passages.csv",
  ),
  comprehension: await readRows(
    "content/assessments/v1/shared/task-3b-comprehension.csv",
  ),
};

const lessonSixRows = ["who", "what", "where", "when", "why"].map(
  (questionType) =>
    comprehension.find((row) => row.question_type === questionType),
);
if (lessonSixRows.some((row) => !row)) {
  throw new Error("Lesson 6 must include all five question families.");
}

const actual = {
  schemaVersion: 1,
  contentVersion: "v1",
  assessments: {
    diagnostic: buildAssessment(assessmentRows, "diagnostic"),
    final: buildAssessment(assessmentRows, "final"),
  },
  lessons: [
    {
      order: 1,
      title: "Letters",
      completionTtsKey: "lesson-1-complete",
      items: [
        ...lessonSpeechItems(letters.slice(0, 5), 1, "mission-1", {
          phase: "Meet the letters",
          prompt: "Say the letter.",
          display: (row) => `${row.uppercase_form} ${row.lowercase_form}`,
          expected: (row) => row.spoken_target,
        }),
        ...lessonSpeechItems(letters.slice(5, 10), 1, "mission-2", {
          phase: "Find the first letter",
          prompt: "Say the first letter.",
          display: (row) => row.highlighted_display,
          expected: (row) => row.spoken_target,
        }),
        ...lessonSpeechItems(letters.slice(10, 15), 1, "mission-3", {
          phase: "Complete the word",
          prompt: "Say the missing letter.",
          display: (row) => row.missing_display,
          expected: (row) => row.spoken_target,
        }),
      ],
    },
    {
      order: 2,
      title: "Words",
      completionTtsKey: "lesson-2-complete",
      items: [
        ...lessonSpeechItems(words.slice(0, 5), 2, "mission-1", {
          phase: "Read the word",
          prompt: "Read the word aloud.",
          display: (row) => row.display_text,
          expected: (row) => row.spoken_target,
        }),
        ...lessonSpeechItems(words.slice(5, 10), 2, "mission-2", {
          phase: "Find the word",
          prompt: "Read the highlighted word.",
          display: (row) => row.context_sentence,
          expected: (row) => row.spoken_target,
        }),
      ],
    },
    {
      order: 3,
      title: "Phrases",
      completionTtsKey: "lesson-3-complete",
      items: lessonSpeechItems(phrases.slice(0, 5), 3, "mission-1", {
        phase: "Read a phrase",
        prompt: "Read the phrase aloud.",
        display: (row) => row.display_text,
        expected: (row) => row.spoken_target,
      }),
    },
    {
      order: 4,
      title: "Sentences",
      completionTtsKey: "lesson-4-complete",
      items: lessonSpeechItems(sentences.slice(0, 5), 4, "mission-1", {
        phase: "Read a sentence",
        prompt: "Read the sentence aloud.",
        display: (row) => row.display_text,
        expected: (row) => row.spoken_target,
      }),
    },
    {
      order: 5,
      title: "Short Passage",
      completionTtsKey: "lesson-5-complete",
      items: lessonSpeechItems(passages.slice(0, 1), 5, "mission-1", {
        phase: "Read a passage",
        prompt: "Read the passage aloud.",
        display: (row) => row.display_text,
        expected: (row) => row.spoken_target,
        long: true,
      }),
    },
    {
      order: 6,
      title: "Comprehension",
      completionTtsKey: "lesson-6-complete",
      items: lessonSixRows.map((row) => {
        const targetParts = row.target_key.split(":")[1].split("-");
        return choiceItem({
          key: `lesson-6-${row.question_type}`,
          phase: "Answer the question",
          prompt: row.question_audio_text,
          display: row.display_text,
          choices: ["a", "b", "c", "d"].map((key) => ({
            key,
            label: row[`choice_${key}`],
          })),
          correctChoice: row.correct_choice_key,
          ttsKey: `lesson-6-question-${targetParts[0]}-${targetParts[1]}`,
        });
      }),
    },
  ],
};

const ttsManifest = JSON.parse(await readFile(ttsManifestPath, "utf8"));
const ttsKeys = new Set(ttsManifest.assets.map(({ key }) => key));
const activities = [
  actual.assessments.diagnostic,
  actual.assessments.final,
  ...actual.lessons,
];
for (const activity of activities) {
  const required = [
    activity.completionTtsKey,
    ...activity.items.map(({ ttsKey }) => ttsKey),
  ];
  for (const key of required) {
    if (!ttsKeys.has(key))
      throw new Error(`Offline content needs missing TTS key: ${key}`);
  }
}

const serialized = `${JSON.stringify(actual, null, 2)}\n`;
if (refresh) {
  await writeFile(outputPath, serialized);
  console.log(
    `Refreshed offline journey content with ${activities.reduce((sum, item) => sum + item.items.length, 0)} activity items.`,
  );
} else {
  const expected = await readFile(outputPath, "utf8");
  if (expected !== serialized) {
    throw new Error(
      "Offline journey content no longer matches the approved CSV and TTS sources. Review the change, then refresh explicitly.",
    );
  }
}

console.log("Offline journey content verified against CSV and TTS sources.");
