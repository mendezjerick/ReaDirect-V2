import type { LearnerSpeechLanguage } from "../learner-auth/learnerApi";

export function isFilipino(
  language: LearnerSpeechLanguage | undefined,
): boolean {
  return language === "fil-PH";
}

export const claraMenuCopy = {
  en: {
    backToDashboard: "Back to dashboard",
    heading: "Learn with Ma'am Clara",
    title: "What should we practice?",
    pickOne: "Pick one",
    chooseLesson: "Choose your lesson",
    readingSkill: "Pick a reading skill",
    choices: "5 choices",
    readingSkills: "Reading skills",
    status: "Choose a lesson for your short class with Ma'am Clara.",
    topics: {
      letters: {
        label: "Letters",
        description: "Meet letters and their sounds.",
      },
      words: { label: "Words", description: "Read and build little words." },
      phrases: { label: "Phrases", description: "Join words smoothly." },
      sentences: {
        label: "Sentences",
        description: "Read a complete thought.",
      },
      comprehension: {
        label: "Comprehension",
        description: "Find meaning in what you read.",
      },
    },
  },
  fil: {
    backToDashboard: "Bumalik sa dashboard",
    heading: "Mag-aral kasama si Ma'am Clara",
    title: "Ano ang gusto nating sanayin?",
    pickOne: "Pumili ng isa",
    chooseLesson: "Piliin ang aralin",
    readingSkill: "Pumili ng kasanayan sa pagbasa",
    choices: "5 pagpipilian",
    readingSkills: "Mga kasanayan sa pagbasa",
    status: "Pumili ng aralin para sa maikling klase kasama si Ma'am Clara.",
    topics: {
      letters: {
        label: "Mga letra",
        description: "Kilalanin ang mga letra at tunog nito.",
      },
      words: {
        label: "Mga salita",
        description: "Basahin at buuin ang maiikling salita.",
      },
      phrases: {
        label: "Mga parirala",
        description: "Pagsamahin ang mga salita nang maayos.",
      },
      sentences: {
        label: "Mga pangungusap",
        description: "Basahin ang buong kaisipan.",
      },
      comprehension: {
        label: "Pag-unawa",
        description: "Hanapin ang kahulugan ng binasa.",
      },
    },
  },
} as const;

export const claraLettersCopy = {
  en: {
    heading: "Learn with Ma'am Clara",
    title: "Letter story",
    back: "Back to Clara classes",
    welcomeLabel: "Today's story",
    welcomeTitle: "The Little-Letter Parade",
    welcomeDescription:
      "A gust scattered the little letters. Help Ma'am Clara bring every partner back before the parade begins.",
    ready: "Your letter story is ready.",
    storyHelp: "The little letters need your help.",
    found: (letter: string) => `You found little ${letter}.`,
    wrong: "That letter has another partner. Look again.",
    find: (lower: string, upper: string) =>
      `Tap the little ${lower} that belongs with big ${upper}.`,
    teach: (letter: string) => `Your turn. Say ${letter} out loud.`,
    complete: "Every letter found its partner. The parade is ready.",
    tryLoading: "Try loading the story",
    seeParade: "See the Parade",
    startStory: "Start Story",
    continueStory: "Continue Story",
    findFirst: "Find the First Letter",
    startParade: "Start the Parade",
    nextStop: "Next Stop",
    playAgain: "Play Again",
    backToClasses: "Back to Classes",
    parade: {
      stationNames: {
        A: "Apple Arch",
        B: "Balloon Float",
        C: "Curved Banner",
        D: "Drum Cart",
        E: "Final Wagon",
      },
      openingTitle: "THE LETTER PARADE",
      finaleTitle: "PARADE READY",
      finaleCopy: "Every partner is here",
      findHeading: "Help Clara find the partner",
      storyHeading: "The Little-Letter Parade",
      foundCount: (found: number, total: number) =>
        `${found} of ${total} found`,
      completionAria:
        "All five big and little letter pairs marching in the parade.",
      storyAria:
        "A gust of wind scatters the little letters away from the parade.",
      sceneAria: (title: string, station: string) =>
        `${title} at the ${station}.`,
      choicesAria: (letter: string) => `Find little ${letter}`,
      chooseLittle: (letter: string) => `Choose little ${letter}`,
      sceneTitle: {
        story: "The little letters blew away",
        completion: "The Letter Parade",
        find: (letter: string) => `Find little ${letter}`,
        teach: (letter: string) => `${letter} found its partner`,
      },
    },
  },
  fil: {
    heading: "Mag-aral kasama si Ma'am Clara",
    title: "Kuwento ng mga letra",
    back: "Bumalik sa mga klase ni Clara",
    welcomeLabel: "Kuwento ngayon",
    welcomeTitle: "Ang Parada ng mga Letra",
    welcomeDescription:
      "Tinangay ng hangin ang maliliit na letra. Tulungan si Ma'am Clara na maibalik ang bawat kapares bago magsimula ang parada.",
    ready: "Handa na ang kuwento ng mga letra.",
    storyHelp: "Kailangan ng maliliit na letra ang tulong mo.",
    found: (letter: string) => `Nakita mo ang maliit na ${letter}.`,
    wrong: "May ibang kapares ang letrang iyon. Tingnan muli.",
    find: (lower: string, upper: string) =>
      `Pindutin ang maliit na ${lower} na kapares ng malaking ${upper}.`,
    teach: (letter: string) =>
      `Ikaw naman. Bigkasin nang malakas ang ${letter}.`,
    complete:
      "Nahanap na ng bawat letra ang kapares nito. Handa na ang parada.",
    tryLoading: "I-load ang kuwento",
    seeParade: "Tingnan ang parada",
    startStory: "Simulan ang kuwento",
    continueStory: "Ipagpatuloy ang kuwento",
    findFirst: "Hanapin ang unang letra",
    startParade: "Simulan ang parada",
    nextStop: "Susunod na hintuan",
    playAgain: "Maglaro muli",
    backToClasses: "Bumalik sa mga klase",
    parade: {
      stationNames: {
        A: "Arko ng Mansanas",
        B: "Lobo",
        C: "Watawat na Kurba",
        D: "Kariton ng Tambol",
        E: "Huling Kariton",
      },
      openingTitle: "PARADA NG MGA LETRA",
      finaleTitle: "HANDA NA ANG PARADA",
      finaleCopy: "Narito na ang lahat ng kapares",
      findHeading: "Tulungan si Clara hanapin ang kapares",
      storyHeading: "Parada ng Maliliit na Letra",
      foundCount: (found: number, total: number) =>
        `${found} sa ${total} nahanap`,
      completionAria:
        "Nasa parada na ang limang pares ng malalaki at maliliit na letra.",
      storyAria: "Tinangay ng hangin ang maliliit na letra mula sa parada.",
      sceneAria: (title: string, station: string) => `${title} sa ${station}.`,
      choicesAria: (letter: string) => `Hanapin ang maliit na ${letter}`,
      chooseLittle: (letter: string) => `Piliin ang maliit na ${letter}`,
      sceneTitle: {
        story: "Tinangay ang maliliit na letra",
        completion: "Parada ng mga Letra",
        find: (letter: string) => `Hanapin ang maliit na ${letter}`,
        teach: (letter: string) => `Nahanap ng ${letter} ang kapares nito`,
      },
    },
  },
} as const;

export const claraPracticeCopy = {
  en: {
    heading: "Learn with Ma'am Clara",
    complete: "Practice complete",
    completedTitle: "You did it!",
    completedMessage:
      "Clara says: Every little step makes your reading stronger.",
    instruction: "Ma'am Clara says: Take your time and try your best.",
    wonderful: "Wonderful work!",
    again: "Let's look again.",
    encouragement: "You can do it!",
    retryHint: "Use the clue and try one more time.",
    answerHint: "Tap an answer, then press Check.",
    finish: "Finish practice",
    next: "Next",
    check: "Check answer",
    retry: "Retry",
    back: "Back to practice menu",
    feedback: {
      chooseWords: "Choose every word first.",
      almost: "Almost! Tap a word in your answer to try again.",
      correctPhrase: "That is right! Clara is proud of your reading.",
      chooseAnswer: "Choose one answer first.",
      goodTry: (clue: string) => `Good try. Look for the clue: ${clue}`,
      correctComprehension: "Correct! You found the clue in the story.",
    },
  },
  fil: {
    heading: "Mag-aral kasama si Ma'am Clara",
    complete: "Tapos na ang pagsasanay",
    completedTitle: "Nagawa mo!",
    completedMessage:
      "Sabi ni Clara: Bawat maliit na hakbang ay nagpapalakas ng iyong pagbasa.",
    instruction:
      "Sabi ni Ma'am Clara: Maglaan ng oras at gawin ang iyong makakaya.",
    wonderful: "Napakahusay!",
    again: "Tingnan nating muli.",
    encouragement: "Kaya mo iyan!",
    retryHint: "Gamitin ang pahiwatig at subukan muli.",
    answerHint: "Pumili ng sagot, pagkatapos ay pindutin ang Suriin.",
    finish: "Tapusin ang pagsasanay",
    next: "Susunod",
    check: "Suriin ang sagot",
    retry: "Subukan muli",
    back: "Bumalik sa menu ng pagsasanay",
    feedback: {
      chooseWords: "Piliin muna ang lahat ng salita.",
      almost: "Malapit na! Pindutin ang salita sa sagot para subukan muli.",
      correctPhrase: "Tama! Ipinagmamalaki ni Clara ang iyong pagbasa.",
      chooseAnswer: "Pumili muna ng isang sagot.",
      goodTry: (clue: string) =>
        `Magandang pagsubok. Hanapin ang pahiwatig: ${clue}`,
      correctComprehension: "Tama! Nahanap mo ang pahiwatig sa kuwento.",
    },
  },
} as const;

export const claraWordsCopy = {
  en: {
    heading: "Learn with Ma'am Clara",
    title: "Word story",
    back: "Back to Clara classes",
    ready: "Your word story is ready.",
    complete: "Every word found its place in the story.",
    preparing: "Ma'am Clara is getting the next story moment ready.",
    speaking: "Listen to Ma'am Clara's story clue.",
    error: "That story sound needs another try.",
    rescueClue: "Clara's rescue clue",
    chooseWord: "Choose the word that belongs in this story moment.",
    wordWrong:
      "That word belongs somewhere else. Look at the story clue again.",
    rescued: (word: string) => `You rescued ${word}. The story can continue.`,
    wrong: "Listen to the story clue and try another word.",
    find: "Listen to the story, then find the word that belongs.",
  },
  fil: {
    heading: "Mag-aral kasama si Ma'am Clara",
    title: "Kuwento ng mga salita",
    back: "Bumalik sa mga klase ni Clara",
    ready: "Handa na ang kuwento ng mga salita.",
    complete: "Nahanap na ng bawat salita ang lugar nito sa kuwento.",
    preparing: "Inihahanda ni Ma'am Clara ang susunod na bahagi ng kuwento.",
    speaking: "Pakinggan ang pahiwatig ni Ma'am Clara sa kuwento.",
    error: "Kailangang subukan muli ang tunog ng kuwento.",
    rescueClue: "Pahiwatig ni Clara sa pagsagip",
    chooseWord: "Piliin ang salitang nababagay sa bahaging ito ng kuwento.",
    wordWrong: "May ibang lugar ang salitang iyon. Tingnan muli ang pahiwatig.",
    rescued: (word: string) =>
      `Nailigtas mo ang ${word}. Maaaring magpatuloy ang kuwento.`,
    wrong: "Pakinggan ang pahiwatig at subukan ang ibang salita.",
    find: "Pakinggan ang kuwento, pagkatapos hanapin ang tamang salita.",
  },
} as const;
