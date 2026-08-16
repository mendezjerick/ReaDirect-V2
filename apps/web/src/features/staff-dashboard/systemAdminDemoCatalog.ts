export interface SystemAdminDemo {
  id: string;
  title: string;
  description: string;
  duration: string;
  videoSource: string;
  posterSource: string;
  steps: string[];
}

export const systemAdminDemos: SystemAdminDemo[] = [
  {
    id: "create-school-administrator",
    title: "Create a School Administrator",
    description:
      "See where temporary credentials are created and how a successful account appears.",
    duration: "About 15 seconds",
    videoSource: "/assets/demos/system-admin/create-school-administrator.webm",
    posterSource:
      "/assets/demos/system-admin/create-school-administrator-poster.webp",
    steps: [
      "Open School administrators.",
      "Enter a temporary username and password.",
      "Create the account and confirm the success message.",
    ],
  },
  {
    id: "school-setup-and-teacher",
    title: "Set Up a School and Teacher",
    description:
      "Follow the School Administrator’s first handoff from naming the school to creating its first Teacher account.",
    duration: "About 23 seconds",
    videoSource: "/assets/demos/system-admin/school-setup-and-teacher.webm",
    posterSource:
      "/assets/demos/system-admin/school-setup-and-teacher-poster.webp",
    steps: [
      "Enter the complete school name during first-time setup.",
      "Continue to the newly prepared School Admin workspace.",
      "Open the Teacher account creator.",
      "Enter fictional temporary credentials.",
      "Assign the Teacher to a grade and section.",
      "Create the account and confirm the assignment.",
    ],
  },
  {
    id: "learner-progression",
    title: "Review Learner Progression",
    description:
      "See how a Teacher reviews one Learner's persisted assessment, lesson, and follow-up evidence.",
    duration: "About 22 seconds",
    videoSource: "/assets/demos/system-admin/learner-progression.webm",
    posterSource: "/assets/demos/system-admin/learner-progression-poster.webp",
    steps: [
      "Open the Teacher Learner directory.",
      "Select View progress for a Learner.",
      "Review the recorded progression stage and diagnostic summary.",
      "Inspect saved lesson evidence.",
      "Read the evidence-based follow-up recommendation.",
    ],
  },
  {
    id: "understand-achievements",
    title: "Understand Achievements",
    description:
      "See how a Learner's saved reading milestones appear as earned and locked achievements.",
    duration: "About 22 seconds",
    videoSource: "/assets/demos/system-admin/understand-achievements.webm",
    posterSource:
      "/assets/demos/system-admin/understand-achievements-poster.webp",
    steps: [
      "Open Achievements on the Learner dashboard.",
      "Read the earned milestone count.",
      "Select a locked badge to see its completion requirement.",
      "Select an earned badge to review the completed milestone.",
      "Remember that achievements update from saved reading progress.",
    ],
  },
  {
    id: "explore-games",
    title: "Explore Games",
    description:
      "Tour the Learner Game Lobby, its temporary game handle, and the reading practice offered by each game.",
    duration: "About 22 seconds",
    videoSource: "/assets/demos/system-admin/explore-games.webm",
    posterSource: "/assets/demos/system-admin/explore-games-poster.webp",
    steps: [
      "Choose a short game username for the play session.",
      "Enter the Game Lobby and review the three available games.",
      "See how Letter Quest practices letter spotting.",
      "See how Ottertale practices simple words.",
      "Note that scores and Top Readers are still coming soon.",
    ],
  },
  {
    id: "learn-with-clara",
    title: "Learn with Ma’am Clara",
    description:
      "See how Ma’am Clara turns letter practice into a guided, animated story with supportive choices.",
    duration: "About 32 seconds",
    videoSource: "/assets/demos/system-admin/learn-with-clara.webm",
    posterSource: "/assets/demos/system-admin/learn-with-clara-poster.webp",
    steps: [
      "Open Learn with Ma’am Clara and choose Letters.",
      "Begin the animated Little-Letter Parade story.",
      "Help big A find its matching little letter.",
      "See the gentle response to an incorrect choice.",
      "Choose little a and watch Ma’am Clara bring the pair together.",
      "Listen as Ma’am Clara models the letter name for the Learner.",
    ],
  },
];

export const plannedSystemAdminDemos: string[] = [];
