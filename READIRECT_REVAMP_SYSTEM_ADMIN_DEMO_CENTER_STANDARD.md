# ReaDirect System Admin Demo Center Standard

## Purpose

The System Admin Demo Center provides short, task-focused walkthroughs inside the protected System Admin workspace. It is a reference library, not a second implementation of the application.

## Safety boundary

- Demo videos are generated during development and served as static assets.
- Recording automation must use fictional sessions and mocked API responses.
- A recording must never create or modify database records, migrations, audit events, accounts, learner progress, or learner-flow content.
- Production users may play a finished video, but cannot start a recorder or run the mocked workflow.

## Recording viewport

Every System Admin walkthrough must be recorded at exactly **360 × 740 CSS pixels** with a device scale factor of `1`.

The canonical command is:

```powershell
corepack pnpm --dir apps/web demos:record
```

The command records the browser at the canonical viewport, generates Ma'am Clara narration through the approved `instruction` reference voice, and normalizes the final WebM to the same dimensions with FFmpeg. The local TTS service must be available at `TTS_SERVICE_URL`, which defaults to `http://127.0.0.1:8002`.

## Presentation requirements

- Show a visible demonstration pointer for taps and selections.
- Use clearly fictional values and never display real credentials or personal information.
- Use short, action-timed narration generated from Ma'am Clara's approved `instruction` reference voice.
- Do not place subtitle banners, default caption tracks, or other overlays over the demonstrated interface.
- Videos use a representative poster frame, native controls, `playsInline`, and no autoplay.
- Each walkthrough includes an equivalent written step list.

## Source of truth

The available and planned walkthroughs are defined in:

`apps/web/src/features/staff-dashboard/systemAdminDemoCatalog.ts`

Generated System Admin video and poster assets live under:

`apps/web/public/assets/demos/system-admin/`

## Available walkthroughs

The first walkthrough demonstrates creating a School Administrator:

1. Enter a temporary username.
2. Enter a temporary password.
3. Create the account and confirm success.

The recording uses mocked network responses and does not reach the ReaDirect API.

The second walkthrough demonstrates the first School Administrator handoff:

1. Complete the school name setup.
2. Open the prepared School Admin workspace.
3. Create a Teacher with temporary credentials.
4. Assign the Teacher to a grade and section.
5. Confirm the new Teacher account.

Both school setup and Teacher creation use mocked network responses.

The third walkthrough demonstrates reviewing one Learner's persisted progress:

1. Open the Teacher Learner directory.
2. Select the Learner's read-only progress workspace.
3. Review the saved progression stage and diagnostic summary.
4. Inspect persisted lesson attempts and support evidence.
5. Read the evidence-based follow-up recommendation.

The Learner, assessment, lesson, and recommendation data are fictional mocked
responses. The recording does not read or modify live Learner records.

The fourth walkthrough explains the Learner achievement collection:

1. Open Achievements on the Learner dashboard.
2. Read the earned milestone count.
3. Select a locked badge and read its remaining requirement.
4. Select an earned badge and review its completed milestone.
5. Explain that saved reading progress determines achievement state.

The Learner session and achievement keys are fictional mocked data. Selecting
an achievement only changes the local detail panel and cannot award or modify
progress.

The fifth walkthrough tours the Learner Game Lobby:

1. Choose a temporary game username.
2. Enter the lobby and review the three available games.
3. Explain the letter practice in Letter Quest.
4. Explain the word practice in Word Trail.
5. Identify scores and the Top Readers board as coming-soon features.

The temporary game profile exists only in recording memory. The walkthrough
does not open a game route, create a save, submit a score, or write persistent
game data.

The sixth walkthrough demonstrates Learn with Ma'am Clara:

1. Open the class menu and choose Letters.
2. Begin the animated Little-Letter Parade story.
3. Help big A find its matching little letter.
4. Show the gentle response to an incorrect choice.
5. Choose little a and bring the letter pair together.
6. Listen as Ma'am Clara models the letter name.

The Learner session, story checkpoint, letter choices, and speech responses are
fictional mocked data held only during recording. The walkthrough does not
create or advance a real listening session, save Learner progress, or modify
lesson content.
