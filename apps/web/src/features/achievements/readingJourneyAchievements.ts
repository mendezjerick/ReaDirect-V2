export const readingJourneyAchievements = [
  {
    key: "reading.ready_reader",
    name: "Ready Reader",
    criteria: "Complete the Diagnostic Assessment",
    iconPath: "/assets/icons/achievements/ready-reader.png",
  },
  {
    key: "reading.letter_leader",
    name: "Letter Leader",
    criteria: "Complete Lesson 1: Letters",
    iconPath: "/assets/icons/achievements/letter-leader.png",
  },
  {
    key: "reading.word_wizard",
    name: "Word Wizard",
    criteria: "Complete Lesson 2: Words",
    iconPath: "/assets/icons/achievements/word-wizard.png",
  },
  {
    key: "reading.phrase_pro",
    name: "Phrase Pro",
    criteria: "Complete Lesson 3: Phrases",
    iconPath: "/assets/icons/achievements/phrase-pro.png",
  },
  {
    key: "reading.sentence_star",
    name: "Sentence Star",
    criteria: "Complete Lesson 4: Sentences",
    iconPath: "/assets/icons/achievements/sentence-star.png",
  },
  {
    key: "reading.passage_explorer",
    name: "Passage Explorer",
    criteria: "Complete Lesson 5: Short Passage",
    iconPath: "/assets/icons/achievements/passage-explorer.png",
  },
  {
    key: "reading.question_detective",
    name: "Question Detective",
    criteria: "Complete Lesson 6: Comprehension",
    iconPath: "/assets/icons/achievements/question-detective.png",
  },
  {
    key: "reading.readirect_champion",
    name: "ReaDirect Champion",
    criteria: "Complete the Final Assessment",
    iconPath: "/assets/icons/achievements/readirect-champion.png",
  },
] as const;

export type ReadingJourneyAchievement =
  (typeof readingJourneyAchievements)[number];
