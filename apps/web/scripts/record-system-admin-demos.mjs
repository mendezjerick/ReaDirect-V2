import { spawn } from "node:child_process";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const RECORDING_VIEWPORT = { width: 360, height: 740 };
const DEMO_PORT = 4174;
const DEMO_BASE_URL = `http://127.0.0.1:${DEMO_PORT}`;
const TTS_SERVICE_URL = process.env.TTS_SERVICE_URL ?? "http://127.0.0.1:8002";
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const webDirectory = resolve(scriptDirectory, "..");
const temporaryDirectory = join(
  webDirectory,
  "test-results",
  "system-admin-demo-recording",
);
const demoOutputDirectory = join(
  webDirectory,
  "public",
  "assets",
  "demos",
  "system-admin",
);
const schoolAdministratorOutputPath = join(
  demoOutputDirectory,
  "create-school-administrator.webm",
);
const schoolAdministratorPosterPath = join(
  demoOutputDirectory,
  "create-school-administrator-poster.webp",
);
const schoolSetupOutputPath = join(
  demoOutputDirectory,
  "school-setup-and-teacher.webm",
);
const schoolSetupPosterPath = join(
  demoOutputDirectory,
  "school-setup-and-teacher-poster.webp",
);
const learnerProgressionOutputPath = join(
  demoOutputDirectory,
  "learner-progression.webm",
);
const learnerProgressionPosterPath = join(
  demoOutputDirectory,
  "learner-progression-poster.webp",
);
const achievementsOutputPath = join(
  demoOutputDirectory,
  "understand-achievements.webm",
);
const achievementsPosterPath = join(
  demoOutputDirectory,
  "understand-achievements-poster.webp",
);
const gamesOutputPath = join(demoOutputDirectory, "explore-games.webm");
const gamesPosterPath = join(demoOutputDirectory, "explore-games-poster.webp");
const claraLessonOutputPath = join(
  demoOutputDirectory,
  "learn-with-clara.webm",
);
const claraLessonPosterPath = join(
  demoOutputDirectory,
  "learn-with-clara-poster.webp",
);

const fictionalSession = {
  token: "fictional-demo-session-token".repeat(2),
  session: { expires_at: "2099-01-01T00:00:00Z" },
  staff: {
    id: 1,
    username: "demo-system-admin",
    email: null,
    display_name: "System Administrator",
    role: "system_admin",
    school: null,
    requires_school_setup: false,
    requires_credential_setup: false,
  },
};

const fictionalAccount = {
  id: 101,
  username: "sunrise-admin",
  display_name: "School Administrator",
  is_active: true,
  school: null,
  requires_school_setup: true,
  requires_credential_setup: true,
  created_at: "2026-07-30T10:00:00+08:00",
};

const fictionalSchoolAdminWithoutSchool = {
  token: "fictional-school-admin-demo-session".repeat(2),
  session: { expires_at: "2099-01-01T00:00:00Z" },
  staff: {
    id: 2,
    username: "sunrise-admin",
    email: null,
    display_name: "School Administrator",
    role: "school_admin",
    school: null,
    requires_school_setup: true,
    requires_credential_setup: true,
  },
};

const fictionalSchoolAdminWithSchool = {
  ...fictionalSchoolAdminWithoutSchool,
  staff: {
    ...fictionalSchoolAdminWithoutSchool.staff,
    school: { id: 3, name: "Sunrise Elementary School" },
    requires_school_setup: false,
  },
};

const fictionalTeacher = {
  id: 14,
  username: "grade3-rizal",
  display_name: "Teacher",
  is_active: true,
  grade_level: 3,
  section: "Rizal",
  requires_credential_setup: true,
  created_at: "2026-07-30T10:10:00+08:00",
};

const fictionalTeacherSession = {
  token: "fictional-teacher-demo-session".repeat(2),
  session: { expires_at: "2099-01-01T00:00:00Z" },
  staff: {
    id: 3,
    username: "grade1-maple",
    email: null,
    display_name: "Teacher",
    role: "teacher",
    school: { id: 4, name: "Northfield Elementary School" },
    requires_school_setup: false,
    requires_credential_setup: false,
    grade_level: 1,
    section: "Maple",
    requires_assignment_acknowledgement: false,
  },
};

const fictionalLearner = {
  id: 12,
  learner_code: "AA012",
  first_name: "Dorothy",
  middle_name: "Gale",
  last_name: "Wright",
  suffix: null,
  full_name: "Dorothy Gale Wright",
  lrn: "123456789012",
  grade_level: 1,
  section: "Maple",
  is_active: true,
  created_at: "2026-07-20T10:00:00Z",
};

const emptyLearnerLessonPerformance = {
  independent_correct: 0,
  supported_correct: 0,
  demonstrated: 0,
  not_yet_correct: 0,
  unscorable_audio: 0,
  skipped: 0,
  academic_attempts: 0,
  technical_retries: 0,
  practice_attempts: 0,
  review_recommended: 0,
};

const fictionalLearnerLessons = Array.from({ length: 6 }, (_, index) => ({
  lesson_key: `required-lesson-${index + 1}`,
  order: index + 1,
  title: [
    "Letter names",
    "Word reading",
    "Phrase reading",
    "Sentence reading",
    "Passage reading",
    "Comprehension",
  ][index],
  status: "not_started",
  current_mission_key: null,
  current_item_index: null,
  items_total: 0,
  items_recorded: 0,
  completed_at: null,
  performance: emptyLearnerLessonPerformance,
  items: [],
}));

fictionalLearnerLessons[1] = {
  ...fictionalLearnerLessons[1],
  status: "completed",
  current_mission_key: "mission-2",
  current_item_index: 0,
  items_total: 1,
  items_recorded: 1,
  completed_at: "2026-07-25T10:00:00Z",
  performance: {
    ...emptyLearnerLessonPerformance,
    supported_correct: 1,
    academic_attempts: 2,
    technical_retries: 1,
    practice_attempts: 1,
    review_recommended: 1,
  },
  items: [
    {
      response_id: 10,
      mission_key: "mission-1",
      item_key: "lesson-v1-word-bag",
      item_order: 1,
      target_label: "bag",
      response_type: "speech",
      decision: "CORRECT",
      outcome: "SUPPORTED_CORRECT",
      final_transcript: "bag",
      academic_attempt_count: 2,
      technical_retry_count: 1,
      highest_scaffold_used: "targeted_clue",
      independent_mastery: false,
      diagnosis_key: "final_letter_substitution",
      review_recommended: true,
      practice_attempt_count: 1,
      attempts: [
        {
          attempt_id: 20,
          attempt_sequence: 1,
          attempt_kind: "independent",
          academic_attempt_number: 1,
          scaffold_level: "none",
          classification: "CLEAR_INCORRECT",
          decision: "INCORRECT",
          final_transcript: "bat",
          selected_response: null,
          incorrect: true,
          recorded_at: "2026-07-25T09:55:00Z",
        },
        {
          attempt_id: 21,
          attempt_sequence: 2,
          attempt_kind: "guided",
          academic_attempt_number: 2,
          scaffold_level: "targeted_clue",
          classification: "CLEAR_CORRECT",
          decision: "CORRECT",
          final_transcript: "bag",
          selected_response: null,
          incorrect: false,
          recorded_at: "2026-07-25T09:56:00Z",
        },
      ],
      completed_at: "2026-07-25T09:56:00Z",
    },
  ],
};

const fictionalLearnerDetail = {
  learner: {
    id: fictionalLearner.id,
    learner_code: fictionalLearner.learner_code,
    full_name: fictionalLearner.full_name,
    first_name: fictionalLearner.first_name,
    middle_name: fictionalLearner.middle_name,
    last_name: fictionalLearner.last_name,
    suffix: fictionalLearner.suffix,
    lrn: fictionalLearner.lrn,
    is_active: fictionalLearner.is_active,
    created_at: fictionalLearner.created_at,
  },
  class_context: {
    school: fictionalTeacherSession.staff.school,
    grade_level: fictionalTeacherSession.staff.grade_level,
    section: fictionalTeacherSession.staff.section,
    teacher: {
      id: fictionalTeacherSession.staff.id,
      name: fictionalTeacherSession.staff.display_name,
      username: fictionalTeacherSession.staff.username,
    },
  },
  progression: {
    recorded: true,
    stage: "required_lessons",
    stage_label: "Required Lesson 3",
    current_required_lesson_order: 3,
    diagnostic_completed_at: "2026-07-24T10:00:00Z",
    final_assessment_completed_at: null,
    last_confirmed_at: "2026-07-25T10:00:00Z",
  },
  assessments: {
    diagnostic: {
      run_id: 8,
      assessment_type: "diagnostic",
      status: "completed",
      stage: "assessment_complete",
      part_one_branch: "high",
      task_scores: { task_1a: 8, task_2a: 10, task_2b: 7 },
      part_one_score: 25,
      part_one_level: "Light Refresher",
      reading_accuracy_percent: 82,
      comprehension_score: 4,
      comprehension_percent: 80,
      final_reading_score: 81,
      final_reading_profile: "Transitioning Reader",
      responses_recorded: 16,
      skipped_items: 1,
      started_at: "2026-07-24T09:00:00Z",
      part_one_completed_at: "2026-07-24T09:30:00Z",
      part_two_completed_at: "2026-07-24T10:00:00Z",
      completed_at: "2026-07-24T10:00:00Z",
    },
    final: null,
  },
  skipped_assessment_items: [
    {
      assessment_type: "diagnostic",
      assessment_label: "Diagnostic Assessment",
      task_key: "task-1a",
      task_label: "Letter Pronunciation",
      item_key: "task-1a-01",
      item_order: 1,
      item_label: "A a",
      recorded_at: "2026-07-24T09:05:00Z",
    },
  ],
  lessons: fictionalLearnerLessons,
  recommendations: [
    {
      key: "lesson-review:required-lesson-2:mission-1:lesson-v1-word-bag",
      kind: "persisted_lesson_review",
      title: "Revisit Word reading item 1",
      reason:
        "The saved outcome for Lesson 2 item 1 is Supported correct. Highest recorded support: Targeted clue. 1 clear incorrect practice attempt was persisted.",
      evidence: {
        lesson_key: "required-lesson-2",
        outcome: "SUPPORTED_CORRECT",
      },
    },
  ],
  generated_at: "2026-07-25T10:05:00Z",
};

const fictionalLearnerSession = {
  token: "fictional-learner-demo-session".repeat(2),
  learner: {
    id: 22,
    learner_code: "BB022",
    full_name: "Maya Bloom Santos",
    first_name: "Maya",
    account_purpose: "standard",
    school: "Northfield Elementary School",
    grade_level: 1,
    section: "Maple",
    progress: {
      stage: "required_lessons",
      current_required_lesson_order: 3,
    },
    achievement_keys: [
      "reading.ready_reader",
      "reading.letter_leader",
      "reading.word_wizard",
    ],
  },
  session: { expires_at: "2099-01-01T00:00:00Z" },
};

function fictionalClaraLettersState(scene) {
  return {
    session_id: 7,
    lesson_key: "letters",
    chapter_key: "letter-names-a-e",
    status: "active",
    visit_count: 1,
    scene,
    prefetch_speech_keys:
      scene.key === "parade-opening"
        ? ["learn-with-clara-letters-find-a"]
        : scene.key === "find-a"
          ? ["lesson-1-letter-demo-A"]
          : ["learn-with-clara-letters-find-b"],
  };
}

const fictionalClaraOpening = fictionalClaraLettersState({
  key: "parade-opening",
  kind: "story",
  title: "The little letters blew away",
  display_text: "A B C D E",
  pronunciation: "",
  speech_key: "learn-with-clara-letters-parade-opening",
  choices: [],
  item_progress: { current: 1, total: 5 },
});

const fictionalClaraFindA = fictionalClaraLettersState({
  key: "find-a",
  kind: "find",
  title: "Find little a",
  display_text: "A a",
  pronunciation: "ay",
  speech_key: "learn-with-clara-letters-find-a",
  choices: ["d", "a", "e"],
  item_progress: { current: 1, total: 5 },
});

const fictionalClaraTeachA = fictionalClaraLettersState({
  key: "teach-a",
  kind: "teach",
  title: "A found its partner",
  display_text: "A a",
  pronunciation: "ay",
  speech_key: "lesson-1-letter-demo-A",
  choices: [],
  item_progress: { current: 1, total: 5 },
});

const schoolAdministratorNarration = [
  {
    startSeconds: 1,
    text: "Enter a temporary username for the new School Administrator.",
  },
  {
    startSeconds: 5.3,
    text: "Add a secure temporary password.",
  },
  { startSeconds: 8.4, text: "Select Create account." },
  {
    startSeconds: 11,
    text: "The School Administrator account is ready.",
  },
];

const schoolSetupNarration = [
  { startSeconds: 1.2, text: "Enter the complete school name." },
  {
    startSeconds: 5,
    text: "Continue to prepare the School Admin workspace.",
  },
  { startSeconds: 8.7, text: "Open the Teacher account creator." },
  {
    startSeconds: 11.5,
    text: "Add fictional temporary credentials.",
  },
  {
    startSeconds: 14.6,
    text: "Assign Grade three, Section Rizal.",
  },
  { startSeconds: 17.2, text: "Create the Teacher account." },
  { startSeconds: 19.4, text: "The Teacher account is ready." },
];

const learnerProgressionNarration = [
  { startSeconds: 1, text: "Select View progress for a Learner." },
  {
    startSeconds: 5,
    text: "The progression card shows the current required lesson.",
  },
  {
    startSeconds: 9,
    text: "Review the saved diagnostic score and reading profile.",
  },
  {
    startSeconds: 13,
    text: "Inspect lesson evidence, including attempts and support.",
  },
  {
    startSeconds: 17,
    text: "Use the persisted recommendation for the next teaching follow-up.",
  },
];

const achievementsNarration = [
  {
    startSeconds: 1,
    text: "Achievements track milestones across the Learner's reading journey.",
  },
  {
    startSeconds: 5.5,
    text: "This Learner has earned three of eight badges.",
  },
  {
    startSeconds: 9,
    text: "Select a locked badge to see what remains to complete.",
  },
  {
    startSeconds: 13,
    text: "Select an earned badge to review the completed milestone.",
  },
  {
    startSeconds: 17,
    text: "Achievements update from saved progress. This screen does not award them.",
  },
];

const gamesNarration = [
  {
    startSeconds: 1,
    text: "Choose a short game name for this play session.",
  },
  {
    startSeconds: 5,
    text: "The lobby offers three reading games.",
  },
  {
    startSeconds: 10.5,
    text: "Letter Quest practices letter spotting and reading streaks.",
  },
  {
    startSeconds: 13.5,
    text: "Word Trail practices simple words.",
  },
  {
    startSeconds: 18,
    text: "Game scores and the Top Readers board are still coming soon.",
  },
];

const claraLessonNarration = [
  {
    startSeconds: 1,
    text: "Learn with Ma'am Clara offers short, guided reading classes.",
  },
  {
    startSeconds: 5,
    text: "Open Letters to begin the Little-Letter Parade story.",
  },
  {
    startSeconds: 12,
    text: "Animated story moments make each letter lesson feel active.",
  },
  {
    startSeconds: 18,
    text: "Help big A find its matching little letter.",
  },
  {
    startSeconds: 22,
    text: "A wrong choice receives a gentle prompt to look again.",
  },
  {
    startSeconds: 26.5,
    text: "Find little a, then listen as Ma'am Clara models the letter name.",
  },
];

function wait(milliseconds) {
  return new Promise((resolvePromise) =>
    setTimeout(resolvePromise, milliseconds),
  );
}

function silentWav(durationSeconds = 0.7) {
  const sampleRate = 16_000;
  const samples = Math.round(sampleRate * durationSeconds);
  const dataSize = samples * 2;
  const wav = Buffer.alloc(44 + dataSize);

  wav.write("RIFF", 0);
  wav.writeUInt32LE(36 + dataSize, 4);
  wav.write("WAVE", 8);
  wav.write("fmt ", 12);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(dataSize, 40);

  return wav;
}

function canConnect(port) {
  return new Promise((resolvePromise) => {
    const socket = createServer();
    socket.once("error", () => resolvePromise(false));
    socket.once("listening", () => {
      socket.close(() => resolvePromise(true));
    });
    socket.listen(port, "127.0.0.1");
  });
}

async function waitForServer(url, timeout = 120_000) {
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The Vite server is still starting.
    }
    await wait(300);
  }

  throw new Error(`Timed out waiting for ${url}.`);
}

function startViteServer() {
  return spawn(
    "corepack",
    ["pnpm", "dev", "--host", "127.0.0.1", "--port", String(DEMO_PORT)],
    {
      cwd: webDirectory,
      shell: process.platform === "win32",
      stdio: "ignore",
      windowsHide: true,
    },
  );
}

async function stopProcess(childProcess) {
  if (!childProcess || childProcess.exitCode !== null) return;

  if (process.platform === "win32") {
    await new Promise((resolvePromise) => {
      const killer = spawn(
        "taskkill",
        ["/pid", String(childProcess.pid), "/T", "/F"],
        { windowsHide: true, stdio: "ignore" },
      );
      killer.once("exit", resolvePromise);
      killer.once("error", resolvePromise);
    });
    return;
  }

  childProcess.kill("SIGTERM");
}

async function runFfmpeg(argumentsList) {
  await new Promise((resolvePromise, rejectPromise) => {
    const ffmpeg = spawn("ffmpeg", argumentsList, {
      windowsHide: true,
      stdio: "inherit",
    });
    ffmpeg.once("error", rejectPromise);
    ffmpeg.once("exit", (code) => {
      if (code === 0) resolvePromise();
      else rejectPromise(new Error(`FFmpeg exited with code ${code}.`));
    });
  });
}

async function synthesizeNarration(cues, outputDirectory, prefix) {
  const narratedCues = [];

  for (const [index, cue] of cues.entries()) {
    const response = await fetch(`${TTS_SERVICE_URL}/synthesize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: cue.text,
        reference: "instruction",
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(
        `Clara narration could not be generated (${response.status}): ${detail}`,
      );
    }

    const audioPath = join(
      outputDirectory,
      `${prefix}-narration-${String(index + 1).padStart(2, "0")}.wav`,
    );
    await writeFile(audioPath, Buffer.from(await response.arrayBuffer()));
    narratedCues.push({ ...cue, audioPath });
  }

  return narratedCues;
}

async function encodeNarratedVideo(rawVideoPath, outputPath, cues) {
  const argumentsList = ["-y", "-i", rawVideoPath];

  for (const cue of cues) {
    argumentsList.push("-i", cue.audioPath);
  }

  const delayedInputs = cues.map((cue, index) => {
    const delay = Math.round(cue.startSeconds * 1_000);
    return `[${index + 1}:a]adelay=${delay}:all=1[n${index}]`;
  });
  const narrationInputs = cues.map((_, index) => `[n${index}]`).join("");
  const filter = [
    ...delayedInputs,
    `${narrationInputs}amix=inputs=${cues.length}:duration=longest:normalize=0,` +
      "loudnorm=I=-18:TP=-1.5:LRA=7[narration]",
  ].join(";");

  argumentsList.push(
    "-filter_complex",
    filter,
    "-map",
    "0:v:0",
    "-map",
    "[narration]",
    "-vf",
    "scale=360:740:flags=lanczos",
    "-c:v",
    "libvpx-vp9",
    "-crf",
    "36",
    "-b:v",
    "0",
    "-c:a",
    "libopus",
    "-b:a",
    "96k",
    "-shortest",
    outputPath,
  );

  await runFfmpeg(argumentsList);
}

async function addDemoPointer(page) {
  await page.addStyleTag({
    content: `
      html {
        scroll-behavior: auto !important;
      }

      #readirect-demo-pointer {
        position: fixed;
        z-index: 2147483647;
        width: 22px;
        height: 22px;
        border: 4px solid #ffffff;
        border-radius: 50%;
        background: #d64b0d;
        box-shadow: 0 2px 7px rgba(12, 46, 79, 0.45);
        transform: translate(-50%, -50%);
        transition: left 380ms ease, top 380ms ease, transform 150ms ease;
        pointer-events: none;
      }

      #readirect-demo-pointer.is-clicking {
        transform: translate(-50%, -50%) scale(0.72);
      }
    `,
  });

  await page.evaluate(() => {
    const pointer = document.createElement("div");
    pointer.id = "readirect-demo-pointer";
    pointer.setAttribute("aria-hidden", "true");
    pointer.style.left = "180px";
    pointer.style.top = "340px";

    document.body.append(pointer);

    window.addEventListener("mousemove", (event) => {
      pointer.style.left = `${event.clientX}px`;
      pointer.style.top = `${event.clientY}px`;
    });

    window.addEventListener("mousedown", () => {
      pointer.classList.add("is-clicking");
    });

    window.addEventListener("mouseup", () => {
      pointer.classList.remove("is-clicking");
    });
  });
}

async function pointTo(page, locator) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) throw new Error("The highlighted control is not visible.");

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, {
    steps: 16,
  });
  await wait(600);
}

async function recordCreateSchoolAdministratorDemo() {
  await rm(temporaryDirectory, { recursive: true, force: true });
  await mkdir(temporaryDirectory, { recursive: true });
  await mkdir(demoOutputDirectory, { recursive: true });

  const portAvailable = await canConnect(DEMO_PORT);
  const viteProcess = portAvailable ? startViteServer() : null;
  let browser;

  try {
    await waitForServer(DEMO_BASE_URL);
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: RECORDING_VIEWPORT,
      deviceScaleFactor: 1,
      colorScheme: "light",
      recordVideo: {
        dir: temporaryDirectory,
        size: RECORDING_VIEWPORT,
      },
    });
    const page = await context.newPage();
    let accountCreated = false;

    await page.addInitScript((session) => {
      window.sessionStorage.setItem(
        "readirect.staff-session",
        JSON.stringify(session),
      );
    }, fictionalSession);

    await page.route("**/api/staff/session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(fictionalSession),
      });
    });

    await page.route(
      "**/api/staff/system-admin/school-administrators",
      async (route) => {
        if (route.request().method() === "POST") {
          accountCreated = true;
          await route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify({ school_administrator: fictionalAccount }),
          });
          return;
        }

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            school_administrators: accountCreated ? [fictionalAccount] : [],
          }),
        });
      },
    );

    await page.goto(
      `${DEMO_BASE_URL}/staff/system-admin/school-administrators`,
      { waitUntil: "networkidle" },
    );
    await page
      .getByRole("heading", { name: "School administrators", level: 1 })
      .waitFor();
    await addDemoPointer(page);
    await wait(2_200);

    const username = page.getByLabel("Username");
    await pointTo(page, username);
    await username.click();
    await username.pressSequentially("sunrise-admin", { delay: 85 });
    await wait(1_000);

    const password = page.getByLabel("Temporary password");
    await pointTo(page, password);
    await password.click();
    await password.pressSequentially("ReadTogether26!", { delay: 75 });
    await wait(1_000);

    const createButton = page.getByRole("button", { name: "Create account" });
    await pointTo(page, createButton);
    await createButton.click();
    await page.getByText("Account created.").waitFor();
    await wait(3_500);

    const video = page.video();
    await context.close();
    const rawVideoPath = await video.path();
    await browser.close();
    browser = null;

    const narratedCues = await synthesizeNarration(
      schoolAdministratorNarration,
      temporaryDirectory,
      "create-school-administrator",
    );
    await encodeNarratedVideo(
      rawVideoPath,
      schoolAdministratorOutputPath,
      narratedCues,
    );
    await runFfmpeg([
      "-y",
      "-ss",
      "00:00:02",
      "-i",
      schoolAdministratorOutputPath,
      "-frames:v",
      "1",
      "-c:v",
      "libwebp",
      "-quality",
      "82",
      schoolAdministratorPosterPath,
    ]);

    const files = await readdir(demoOutputDirectory);
    console.log(
      `Recorded ${RECORDING_VIEWPORT.width}x${RECORDING_VIEWPORT.height} demo:`,
      schoolAdministratorOutputPath,
    );
    console.log(`Demo assets: ${files.join(", ")}`);
  } finally {
    if (browser) await browser.close();
    await stopProcess(viteProcess);
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

async function recordSchoolSetupAndTeacherDemo() {
  await rm(temporaryDirectory, { recursive: true, force: true });
  await mkdir(temporaryDirectory, { recursive: true });
  await mkdir(demoOutputDirectory, { recursive: true });

  const portAvailable = await canConnect(DEMO_PORT);
  const viteProcess = portAvailable ? startViteServer() : null;
  let browser;

  try {
    await waitForServer(DEMO_BASE_URL);
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: RECORDING_VIEWPORT,
      deviceScaleFactor: 1,
      colorScheme: "light",
      recordVideo: {
        dir: temporaryDirectory,
        size: RECORDING_VIEWPORT,
      },
    });
    const page = await context.newPage();
    let schoolSetupComplete = false;
    let teacherCreated = false;

    await page.addInitScript((session) => {
      window.sessionStorage.setItem(
        "readirect.staff-session",
        JSON.stringify(session),
      );
    }, fictionalSchoolAdminWithoutSchool);

    await page.route("**/api/staff/session", async (route) => {
      const session = schoolSetupComplete
        ? fictionalSchoolAdminWithSchool
        : fictionalSchoolAdminWithoutSchool;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          staff: session.staff,
          session: session.session,
        }),
      });
    });

    await page.route("**/api/staff/school-admin/2/school", async (route) => {
      schoolSetupComplete = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ staff: fictionalSchoolAdminWithSchool.staff }),
      });
    });

    await page.route("**/api/staff/school-admin/2/overview", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          school: fictionalSchoolAdminWithSchool.staff.school,
          metrics: {
            total_teachers: teacherCreated ? 1 : 0,
            total_learners: 0,
            active_learners: 0,
          },
          part_one_distribution: [
            { label: "Full Refresher", value: 0 },
            { label: "Moderate Refresher", value: 0 },
            { label: "Light Refresher", value: 0 },
            { label: "Grade Ready", value: 0 },
          ],
          recent_assessment_activity: [],
          requires_credential_setup: true,
          generated_at: "2026-07-30T10:05:00+08:00",
        }),
      });
    });

    await page.route("**/api/staff/school-admin/2/teachers", async (route) => {
      if (route.request().method() === "POST") {
        teacherCreated = true;
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ teacher: fictionalTeacher }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          teachers: teacherCreated ? [fictionalTeacher] : [],
        }),
      });
    });

    await page.goto(`${DEMO_BASE_URL}/staff/school-admin/setup-school`, {
      waitUntil: "networkidle",
    });
    await page.getByRole("heading", { name: "Tell us your school" }).waitFor();
    await addDemoPointer(page);
    await wait(1_800);

    const schoolName = page.getByLabel("School name");
    await pointTo(page, schoolName);
    await schoolName.click();
    await schoolName.pressSequentially("Sunrise Elementary School", {
      delay: 55,
    });
    await schoolName.blur();
    await wait(700);

    const continueButton = page.getByRole("button", {
      name: "Continue to dashboard",
    });
    await pointTo(page, continueButton);
    await continueButton.click();
    await page
      .getByRole("heading", { name: "Sunrise Elementary School" })
      .waitFor();
    await wait(800);

    const createTeacherShortcut = page.getByRole("button", {
      name: "Create Teacher",
    });
    await pointTo(page, createTeacherShortcut);
    await createTeacherShortcut.click();
    await page.getByRole("heading", { name: "Teachers", level: 1 }).waitFor();

    const username = page.getByLabel("Username");
    await pointTo(page, username);
    await username.click();
    await username.pressSequentially("grade3-rizal", { delay: 65 });
    const password = page.getByLabel("Temporary password");
    await pointTo(page, password);
    await password.click();
    await password.pressSequentially("ReadTogether26!", { delay: 55 });

    const gradeLevel = page.getByLabel("Grade level");
    await pointTo(page, gradeLevel);
    await gradeLevel.selectOption("3");
    const section = page.getByLabel("Section");
    await pointTo(page, section);
    await section.click();
    await section.pressSequentially("Rizal", { delay: 75 });
    await wait(600);

    const createTeacherButton = page.getByRole("button", {
      name: "Create Teacher",
    });
    await pointTo(page, createTeacherButton);
    await createTeacherButton.click();
    const teacherCreatedNotice = page.getByText("Teacher created.");
    await teacherCreatedNotice.waitFor();
    await pointTo(page, teacherCreatedNotice);
    await wait(5_000);

    const video = page.video();
    await context.close();
    const rawVideoPath = await video.path();
    await browser.close();
    browser = null;

    const narratedCues = await synthesizeNarration(
      schoolSetupNarration,
      temporaryDirectory,
      "school-setup-and-teacher",
    );
    await encodeNarratedVideo(
      rawVideoPath,
      schoolSetupOutputPath,
      narratedCues,
    );
    await runFfmpeg([
      "-y",
      "-ss",
      "00:00:01.5",
      "-i",
      schoolSetupOutputPath,
      "-frames:v",
      "1",
      "-c:v",
      "libwebp",
      "-quality",
      "82",
      schoolSetupPosterPath,
    ]);

    const files = await readdir(demoOutputDirectory);
    console.log(
      `Recorded ${RECORDING_VIEWPORT.width}x${RECORDING_VIEWPORT.height} demo:`,
      schoolSetupOutputPath,
    );
    console.log(`Demo assets: ${files.join(", ")}`);
  } finally {
    if (browser) await browser.close();
    await stopProcess(viteProcess);
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

async function recordLearnerProgressionDemo() {
  await rm(temporaryDirectory, { recursive: true, force: true });
  await mkdir(temporaryDirectory, { recursive: true });
  await mkdir(demoOutputDirectory, { recursive: true });

  const portAvailable = await canConnect(DEMO_PORT);
  const viteProcess = portAvailable ? startViteServer() : null;
  let browser;

  try {
    await waitForServer(DEMO_BASE_URL);
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: RECORDING_VIEWPORT,
      deviceScaleFactor: 1,
      colorScheme: "light",
      recordVideo: {
        dir: temporaryDirectory,
        size: RECORDING_VIEWPORT,
      },
    });
    const page = await context.newPage();

    await page.addInitScript((session) => {
      window.sessionStorage.setItem(
        "readirect.staff-session",
        JSON.stringify(session),
      );
    }, fictionalTeacherSession);

    await page.route("**/api/staff/session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          staff: fictionalTeacherSession.staff,
          session: fictionalTeacherSession.session,
        }),
      });
    });

    await page.route("**/api/staff/teacher/3/learners/12", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(fictionalLearnerDetail),
      });
    });

    await page.route("**/api/staff/teacher/3/learners", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ learners: [fictionalLearner] }),
      });
    });

    await page.goto(`${DEMO_BASE_URL}/staff/teacher/learners`, {
      waitUntil: "networkidle",
    });
    await page.getByRole("heading", { name: "Learners", level: 1 }).waitFor();
    await addDemoPointer(page);
    await wait(1_200);

    const viewProgressButton = page.getByRole("button", {
      name: "View progress",
    });
    await pointTo(page, viewProgressButton);
    await wait(500);
    await viewProgressButton.click();
    await page
      .getByRole("heading", { name: fictionalLearner.full_name, level: 1 })
      .waitFor();

    const progressionStage = page.getByRole("heading", {
      name: "Required Lesson 3",
    });
    await pointTo(page, progressionStage);
    await wait(2_200);

    const readingProfile = page.getByText("Transitioning Reader", {
      exact: true,
    });
    await pointTo(page, readingProfile);
    await wait(2_800);

    const savedLessonItem = page.getByRole("heading", {
      name: "bag",
      exact: true,
    });
    await pointTo(page, savedLessonItem);
    await wait(3_000);

    const recommendation = page.getByRole("heading", {
      name: "Revisit Word reading item 1",
    });
    await pointTo(page, recommendation);
    await wait(6_000);

    const video = page.video();
    await context.close();
    const rawVideoPath = await video.path();
    await browser.close();
    browser = null;

    const narratedCues = await synthesizeNarration(
      learnerProgressionNarration,
      temporaryDirectory,
      "learner-progression",
    );
    await encodeNarratedVideo(
      rawVideoPath,
      learnerProgressionOutputPath,
      narratedCues,
    );
    await runFfmpeg([
      "-y",
      "-ss",
      "00:00:05.5",
      "-i",
      learnerProgressionOutputPath,
      "-frames:v",
      "1",
      "-c:v",
      "libwebp",
      "-quality",
      "82",
      learnerProgressionPosterPath,
    ]);

    const files = await readdir(demoOutputDirectory);
    console.log(
      `Recorded ${RECORDING_VIEWPORT.width}x${RECORDING_VIEWPORT.height} demo:`,
      learnerProgressionOutputPath,
    );
    console.log(`Demo assets: ${files.join(", ")}`);
  } finally {
    if (browser) await browser.close();
    await stopProcess(viteProcess);
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

async function recordAchievementsDemo() {
  await rm(temporaryDirectory, { recursive: true, force: true });
  await mkdir(temporaryDirectory, { recursive: true });
  await mkdir(demoOutputDirectory, { recursive: true });

  const portAvailable = await canConnect(DEMO_PORT);
  const viteProcess = portAvailable ? startViteServer() : null;
  let browser;

  try {
    await waitForServer(DEMO_BASE_URL);
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: RECORDING_VIEWPORT,
      deviceScaleFactor: 1,
      colorScheme: "light",
      recordVideo: {
        dir: temporaryDirectory,
        size: RECORDING_VIEWPORT,
      },
    });
    const page = await context.newPage();

    await page.addInitScript((session) => {
      window.sessionStorage.setItem(
        "readirect.learner-session",
        JSON.stringify(session),
      );
    }, fictionalLearnerSession);

    await page.route("**/api/learners/session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          learner: fictionalLearnerSession.learner,
          session: fictionalLearnerSession.session,
        }),
      });
    });

    await page.route("**/api/learners/tts/activity-manifest", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          activity: "lesson-3",
          published_groups: [],
          published_speech_keys: [],
          runtime_profiles: [],
          requires_runtime: false,
        }),
      });
    });

    await page.route(
      "**/api/learners/tts/activity-readiness",
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            activity: "lesson-3",
            ready: true,
            published_ready: true,
            published_groups: [],
            voice_version: "fictional-demo",
            unavailable_speech_keys: [],
            runtime_required: false,
            runtime_ready: true,
            runtime_profiles: [],
            profiles_ready: [],
            device: "mock",
          }),
        });
      },
    );

    await page.goto(`${DEMO_BASE_URL}/learner/dashboard`, {
      waitUntil: "networkidle",
    });
    await page
      .getByRole("heading", { name: "Welcome, Maya!", level: 1 })
      .waitFor();
    await addDemoPointer(page);
    await wait(1_200);

    const achievementsHeading = page.getByRole("heading", {
      name: "Achievements",
      level: 2,
    });
    await pointTo(page, achievementsHeading);
    await wait(3_000);

    const achievementCount = page.getByText("3/8", { exact: true });
    await pointTo(page, achievementCount);
    await wait(2_000);

    const lockedAchievement = page.getByRole("button", {
      name: "View Passage Explorer achievement",
    });
    await pointTo(page, lockedAchievement);
    await lockedAchievement.click();
    const lockedCriteria = page.getByText("Complete Lesson 5: Short Passage", {
      exact: true,
    });
    await pointTo(page, lockedCriteria);
    await wait(3_000);

    const earnedAchievement = page.getByRole("button", {
      name: "View Word Wizard achievement",
    });
    await pointTo(page, earnedAchievement);
    await earnedAchievement.click();
    const earnedCriteria = page.getByText("Complete Lesson 2: Words", {
      exact: true,
    });
    await pointTo(page, earnedCriteria);
    await wait(10_000);

    const video = page.video();
    await context.close();
    const rawVideoPath = await video.path();
    await browser.close();
    browser = null;

    const narratedCues = await synthesizeNarration(
      achievementsNarration,
      temporaryDirectory,
      "understand-achievements",
    );
    await encodeNarratedVideo(
      rawVideoPath,
      achievementsOutputPath,
      narratedCues,
    );
    await runFfmpeg([
      "-y",
      "-ss",
      "00:00:06.5",
      "-i",
      achievementsOutputPath,
      "-frames:v",
      "1",
      "-c:v",
      "libwebp",
      "-quality",
      "82",
      achievementsPosterPath,
    ]);

    const files = await readdir(demoOutputDirectory);
    console.log(
      `Recorded ${RECORDING_VIEWPORT.width}x${RECORDING_VIEWPORT.height} demo:`,
      achievementsOutputPath,
    );
    console.log(`Demo assets: ${files.join(", ")}`);
  } finally {
    if (browser) await browser.close();
    await stopProcess(viteProcess);
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

async function recordGamesDemo() {
  await rm(temporaryDirectory, { recursive: true, force: true });
  await mkdir(temporaryDirectory, { recursive: true });
  await mkdir(demoOutputDirectory, { recursive: true });

  const portAvailable = await canConnect(DEMO_PORT);
  const viteProcess = portAvailable ? startViteServer() : null;
  let browser;

  try {
    await waitForServer(DEMO_BASE_URL);
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: RECORDING_VIEWPORT,
      deviceScaleFactor: 1,
      colorScheme: "light",
      recordVideo: {
        dir: temporaryDirectory,
        size: RECORDING_VIEWPORT,
      },
    });
    const page = await context.newPage();

    await page.addInitScript((session) => {
      window.sessionStorage.setItem(
        "readirect.learner-session",
        JSON.stringify(session),
      );
    }, fictionalLearnerSession);

    await page.goto(`${DEMO_BASE_URL}/learner/games`, {
      waitUntil: "networkidle",
    });
    await page
      .getByRole("heading", { name: "Choose a Game", level: 1 })
      .waitFor();
    await addDemoPointer(page);
    await wait(1_000);

    const gameUsername = page.getByLabel("Game username");
    await pointTo(page, gameUsername);
    await gameUsername.click();
    await gameUsername.pressSequentially("Reader7", { delay: 90 });
    await wait(400);

    const enterLobby = page.getByRole("button", {
      name: "Enter the Lobby",
    });
    await pointTo(page, enterLobby);
    await enterLobby.click();

    const lobbyHeading = page.getByRole("heading", {
      name: "Ready to play?",
      level: 2,
    });
    await lobbyHeading.waitFor();
    await pointTo(page, lobbyHeading);
    await wait(2_200);

    const letterQuest = page.getByRole("heading", {
      name: "Letter Quest",
      level: 3,
    });
    await pointTo(page, letterQuest);
    await wait(3_000);

    const wordTrail = page.getByRole("heading", {
      name: "Word Trail",
      level: 3,
    });
    await pointTo(page, wordTrail);
    await wait(3_000);

    const topReaders = page.getByRole("heading", {
      name: "Top Readers",
      level: 2,
    });
    await pointTo(page, topReaders);
    await wait(7_000);

    const video = page.video();
    await context.close();
    const rawVideoPath = await video.path();
    await browser.close();
    browser = null;

    const narratedCues = await synthesizeNarration(
      gamesNarration,
      temporaryDirectory,
      "explore-games",
    );
    await encodeNarratedVideo(rawVideoPath, gamesOutputPath, narratedCues);
    await runFfmpeg([
      "-y",
      "-ss",
      "00:00:06",
      "-i",
      gamesOutputPath,
      "-frames:v",
      "1",
      "-c:v",
      "libwebp",
      "-quality",
      "82",
      gamesPosterPath,
    ]);

    const files = await readdir(demoOutputDirectory);
    console.log(
      `Recorded ${RECORDING_VIEWPORT.width}x${RECORDING_VIEWPORT.height} demo:`,
      gamesOutputPath,
    );
    console.log(`Demo assets: ${files.join(", ")}`);
  } finally {
    if (browser) await browser.close();
    await stopProcess(viteProcess);
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

async function recordClaraLessonDemo() {
  await rm(temporaryDirectory, { recursive: true, force: true });
  await mkdir(temporaryDirectory, { recursive: true });
  await mkdir(demoOutputDirectory, { recursive: true });

  const portAvailable = await canConnect(DEMO_PORT);
  const viteProcess = portAvailable ? startViteServer() : null;
  let browser;

  try {
    await waitForServer(DEMO_BASE_URL);
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: RECORDING_VIEWPORT,
      deviceScaleFactor: 1,
      colorScheme: "light",
      recordVideo: {
        dir: temporaryDirectory,
        size: RECORDING_VIEWPORT,
      },
    });
    const page = await context.newPage();
    const demoSpeech = silentWav();

    await page.addInitScript((session) => {
      window.sessionStorage.setItem(
        "readirect.learner-session",
        JSON.stringify(session),
      );
    }, fictionalLearnerSession);

    await page.route(
      "**/api/learners/learn-with-clara/letters/**",
      async (route) => {
        const request = route.request();
        let state = fictionalClaraOpening;

        if (request.url().endsWith("/advance")) {
          const requestBody = request.postDataJSON();
          state =
            requestBody.scene_key === "parade-opening"
              ? fictionalClaraFindA
              : fictionalClaraTeachA;
        }

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(state),
        });
      },
    );

    await page.route("**/api/learners/tts/speech/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "audio/wav",
        body: demoSpeech,
      });
    });

    await page.goto(`${DEMO_BASE_URL}/learner/learn-with-clara`, {
      waitUntil: "networkidle",
    });
    await page
      .getByRole("heading", {
        name: "What should we practice?",
        level: 1,
      })
      .waitFor();
    await addDemoPointer(page);
    await wait(1_000);

    const lettersClass = page.getByRole("button", { name: /^Letters/ });
    await pointTo(page, lettersClass);
    await wait(2_000);
    await lettersClass.click();

    const welcomeTitle = page.getByRole("heading", {
      name: "The Little-Letter Parade",
      level: 2,
    });
    await welcomeTitle.waitFor();
    await pointTo(page, welcomeTitle);
    await wait(2_400);

    const startStory = page.getByRole("button", { name: "Start Story" });
    await startStory.waitFor();
    await pointTo(page, startStory);
    await startStory.click();

    const openingTitle = page.getByRole("heading", {
      name: "The little letters blew away",
      level: 2,
    });
    await openingTitle.waitFor();
    const findFirstLetter = page.getByRole("button", {
      name: "Find the First Letter",
    });
    await findFirstLetter.waitFor({ timeout: 30_000 });
    await pointTo(page, openingTitle);
    await wait(2_500);
    await pointTo(page, findFirstLetter);
    await findFirstLetter.click();

    const findTitle = page.getByRole("heading", {
      name: "Find little a",
      level: 2,
    });
    await findTitle.waitFor();
    const wrongChoice = page.getByRole("button", {
      name: "Choose little d",
    });
    await wrongChoice.waitFor();
    await wrongChoice.waitFor({ state: "visible" });
    await pointTo(page, findTitle);
    await wait(2_500);
    await pointTo(page, wrongChoice);
    await wrongChoice.click();
    await wait(2_000);

    const correctChoice = page.getByRole("button", {
      name: "Choose little a",
    });
    await pointTo(page, correctChoice);
    await correctChoice.click();

    const teachingTitle = page.getByRole("heading", {
      name: "A found its partner",
      level: 2,
    });
    await teachingTitle.waitFor();
    await pointTo(page, teachingTitle);
    await wait(7_000);

    const video = page.video();
    await context.close();
    const rawVideoPath = await video.path();
    await browser.close();
    browser = null;

    const narratedCues = await synthesizeNarration(
      claraLessonNarration,
      temporaryDirectory,
      "learn-with-clara",
    );
    await encodeNarratedVideo(
      rawVideoPath,
      claraLessonOutputPath,
      narratedCues,
    );
    await runFfmpeg([
      "-y",
      "-ss",
      "00:00:16",
      "-i",
      claraLessonOutputPath,
      "-frames:v",
      "1",
      "-c:v",
      "libwebp",
      "-quality",
      "82",
      claraLessonPosterPath,
    ]);

    const files = await readdir(demoOutputDirectory);
    console.log(
      `Recorded ${RECORDING_VIEWPORT.width}x${RECORDING_VIEWPORT.height} demo:`,
      claraLessonOutputPath,
    );
    console.log(`Demo assets: ${files.join(", ")}`);
  } finally {
    if (browser) await browser.close();
    await stopProcess(viteProcess);
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

const requestedDemo =
  process.argv.slice(2).find((argument) => argument !== "--") ?? "all";

if (
  requestedDemo === "all" ||
  requestedDemo === "create-school-administrator"
) {
  await recordCreateSchoolAdministratorDemo();
}

if (requestedDemo === "all" || requestedDemo === "school-setup-and-teacher") {
  await recordSchoolSetupAndTeacherDemo();
}

if (requestedDemo === "all" || requestedDemo === "learner-progression") {
  await recordLearnerProgressionDemo();
}

if (requestedDemo === "all" || requestedDemo === "understand-achievements") {
  await recordAchievementsDemo();
}

if (requestedDemo === "all" || requestedDemo === "explore-games") {
  await recordGamesDemo();
}

if (requestedDemo === "all" || requestedDemo === "learn-with-clara") {
  await recordClaraLessonDemo();
}

if (
  requestedDemo !== "all" &&
  requestedDemo !== "create-school-administrator" &&
  requestedDemo !== "school-setup-and-teacher" &&
  requestedDemo !== "learner-progression" &&
  requestedDemo !== "understand-achievements" &&
  requestedDemo !== "explore-games" &&
  requestedDemo !== "learn-with-clara"
) {
  throw new Error(`Unknown demo key: ${requestedDemo}`);
}
