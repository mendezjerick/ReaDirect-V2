import type { NpcId } from "./npcs";
import { applyFilipinoMissionTranslation } from "../localization/filipinoMissions";
import type { GameLanguage } from "../localization/language";

export type ComprehensionSkill =
  | "who"
  | "what"
  | "where"
  | "how"
  | "why"
  | "main-idea"
  | "sequence"
  | "cause-and-effect"
  | "detail"
  | "inference";

export type QuestionCategory =
  | "direct-detail"
  | "character-setting"
  | "sequence-cause"
  | "meaning";

export type MissionChoice = { id: string; text: string };

export type MissionQuestion = {
  id: string;
  missionId: MissionId;
  prompt: string;
  choices: readonly MissionChoice[];
  correctChoiceId: string;
  skill: ComprehensionSkill;
  category: QuestionCategory;
  hint: string;
  explanation: string;
  correctFeedback: string;
  incorrectFeedback: string;
};

export type MissionDefinition = {
  id: MissionId;
  order: number;
  npcId: NpcId;
  location: string;
  situation: string;
  objective: string;
  objectiveHelp: string;
  briefing: readonly string[];
  reading: {
    format: string;
    title: string;
    pages: readonly string[];
  };
  facts: readonly string[];
  requiredInteractions: readonly string[];
  action: {
    prompt: string;
    choices: readonly MissionChoice[];
    correctChoiceId: string;
    hint: string;
    correctFeedback: string;
    incorrectFeedback: string;
  };
  questions: readonly MissionQuestion[];
  completionCondition: string;
  worldResult: string;
  reward: string;
  nextMissionId: MissionId | null;
};

export const MISSION_IDS = [
  "plaza-welcome",
  "market-supplies",
  "village-delivery",
  "bridge-safety",
  "forest-route",
  "community-finale"
] as const;

export type MissionId = (typeof MISSION_IDS)[number];

type QuestionDraft = Omit<MissionQuestion, "missionId" | "choices" | "correctChoiceId"> & {
  answers: readonly [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
};

function choices(id: string, answers: readonly [string, string, string, string]) {
  return answers.map((text, index) => ({ id: `${id}-choice-${index + 1}`, text }));
}

function action(id: string, prompt: string, answers: readonly [string, string, string, string], correctIndex: 0 | 1 | 2 | 3, hint: string, correctFeedback: string, incorrectFeedback: string) {
  const actionChoices = choices(`${id}-action`, answers);
  return {
    prompt,
    choices: actionChoices,
    correctChoiceId: actionChoices[correctIndex].id,
    hint,
    correctFeedback,
    incorrectFeedback
  };
}

function questions(missionId: MissionId, drafts: readonly QuestionDraft[]): readonly MissionQuestion[] {
  return drafts.map(({ answers, correctIndex, ...draft }) => {
    const questionChoices = choices(draft.id, answers);
    return {
      ...draft,
      missionId,
      choices: questionChoices,
      correctChoiceId: questionChoices[correctIndex].id
    };
  });
}

export const MISSIONS: readonly MissionDefinition[] = [
  {
    id: "plaza-welcome",
    order: 1,
    npcId: "miss-estelle",
    location: "central plaza",
    situation: "The village is getting ready to read together.",
    objective: "Talk to Miss Estelle in the central plaza",
    objectiveHelp: "Go near Miss Estelle. Choose Interact.",
    briefing: [
      "The village will read together. Please help us get ready.",
      "Read this notice. Find where the welcome sign goes."
    ],
    reading: {
      format: "Community Notice",
      title: "Where the Reading Journey Begins",
      pages: [
        "The reading activity begins this afternoon. It starts in the central plaza.",
        "Miss Estelle will wait beside the plaza path. Put the welcome sign there. Then visit the market."
      ]
    },
    facts: ["The activity begins in the central plaza.", "The welcome sign goes beside the plaza path.", "The market comes next."],
    requiredInteractions: ["Read the notice", "Place the welcome sign beside the plaza path", "Answer every notice question"],
    action: action(
      "plaza-welcome",
      "Where will you place the welcome sign?",
      ["Beside the central plaza path", "At the old bridge", "Behind the market", "On the forest trail"],
      0,
      "Read the second sentence. It tells you where the sign goes.",
      "The sign is ready beside the plaza path.",
      "Almost! Read the second sentence again."
    ),
    questions: questions("plaza-welcome", [
      {
        id: "plaza-start-place",
        prompt: "Where does the community reading activity begin?",
        answers: ["Central plaza", "Old bridge", "Market area", "Forest trail"],
        correctIndex: 0,
        skill: "where",
        category: "character-setting",
        hint: "Look at the first sentence of the notice.",
        explanation: "The notice says the activity begins in the central plaza.",
        correctFeedback: "Correct. Readers will gather in the central plaza.",
        incorrectFeedback: "Almost! Check where the activity begins."
      },
      {
        id: "plaza-next-stop",
        prompt: "Where should you go after placing the sign?",
        answers: ["The market", "The bridge", "The forest", "The east homes"],
        correctIndex: 0,
        skill: "sequence",
        category: "sequence-cause",
        hint: "Read the last words of the notice.",
        explanation: "The notice says to place the sign before visiting the market.",
        correctFeedback: "Right. The market is the next stop on the journey.",
        incorrectFeedback: "Almost! Read what comes after the sign."
      }
    ]),
    completionCondition: "The sign is placed correctly and both notice questions are answered.",
    worldResult: "A welcome sign now marks the central plaza path.",
    reward: "Welcome Ribbon",
    nextMissionId: "market-supplies"
  },
  {
    id: "market-supplies",
    order: 2,
    npcId: "market-vendor",
    location: "market area",
    situation: "The activity tables need the correct supplies packed in the written order.",
    objective: "Visit the Market Vendor for the activity supplies",
    objectiveHelp: "Go to the market. Talk to the Market Vendor.",
    briefing: [
      "Miss Estelle sent a supply order. Pack each item in order.",
      "Read the order. Choose the first item."
    ],
    reading: {
      format: "Supply Order",
      title: "Market Order for the Reading Tables",
      pages: [
        "Prepare three mangoes. Get two water pitchers and one folded cloth.",
        "Pack the cloth first. Add the pitchers second. Put the mangoes on top. Take the crate to Lolo Ambo."
      ]
    },
    facts: ["There are three mangoes.", "There are two water pitchers.", "The cloth is packed first, and the supplies go to Lolo Ambo."],
    requiredInteractions: ["Read the supply order", "Choose the first item to pack", "Answer every order question"],
    action: action(
      "market-supplies",
      "Which item will you pack first?",
      ["The folded table cloth", "The three mangoes", "The two water pitchers", "An empty basket"],
      0,
      "Read the packing order. Which item goes first?",
      "Correct! The cloth lies flat in the crate.",
      "Almost! Read the packing order again."
    ),
    questions: questions("market-supplies", [
      {
        id: "market-mango-count",
        prompt: "How many mangoes does the order request?",
        answers: ["Three", "Two", "One", "Four"],
        correctIndex: 0,
        skill: "detail",
        category: "direct-detail",
        hint: "The first sentence gives a number before mangoes.",
        explanation: "The order requests three mangoes.",
        correctFeedback: "Correct. Three mangoes belong in the crate.",
        incorrectFeedback: "Almost! Check the number of mangoes."
      },
      {
        id: "market-second-item",
        prompt: "What should be added second?",
        answers: ["The water pitchers", "The folded cloth", "The mangoes", "The welcome sign"],
        correctIndex: 0,
        skill: "sequence",
        category: "sequence-cause",
        hint: "Follow the words first, second, and then.",
        explanation: "The pitchers are added after the cloth and before the mangoes.",
        correctFeedback: "Right. The pitchers are packed second.",
        incorrectFeedback: "Almost! Follow the packing order again."
      },
      {
        id: "market-recipient",
        prompt: "Who should receive the packed supplies?",
        answers: ["Lolo Ambo", "Miss Estelle", "Bridge Keeper", "Market Vendor"],
        correctIndex: 0,
        skill: "who",
        category: "character-setting",
        hint: "The final sentence names the person near the east homes.",
        explanation: "The order says to send everything to Lolo Ambo.",
        correctFeedback: "Correct. Lolo Ambo is waiting for the supplies.",
        incorrectFeedback: "Almost! Read who gets the crate."
      }
    ]),
    completionCondition: "The crate is packed in the correct order and all supply questions are answered.",
    worldResult: "The activity supplies are packed securely for delivery.",
    reward: "Supply Token",
    nextMissionId: "village-delivery"
  },
  {
    id: "village-delivery",
    order: 3,
    npcId: "lolo-ambo",
    location: "east homes",
    situation: "Lolo Ambo has a note for the supplies.",
    objective: "Deliver the supplies to Lolo Ambo near the east homes",
    objectiveHelp: "Go to the east homes. Talk to Lolo Ambo.",
    briefing: [
      "The crate is safe. This note tells where each item goes.",
      "Read the note. Find where the pitchers go."
    ],
    reading: {
      format: "Delivery Note",
      title: "A Note for the Activity Stations",
      pages: [
        "Keep the mangoes at the market table. Take the two pitchers to the plaza reading table.",
        "Give the folded cloth to the Bridge Keeper. It marks a safe waiting place."
      ]
    },
    facts: ["Mangoes stay at the market table.", "Pitchers go to the central plaza reading table.", "The cloth goes to the Bridge Keeper."],
    requiredInteractions: ["Read the delivery note", "Choose the pitchers' destination", "Answer every delivery question"],
    action: action(
      "village-delivery",
      "Where will you take the two water pitchers?",
      ["The central plaza reading table", "The old bridge waiting place", "The market snack table", "The forest trail"],
      0,
      "Find the sentence about the pitchers.",
      "Correct! The pitchers are on the plaza table.",
      "Almost! Find the sentence about the pitchers."
    ),
    questions: questions("village-delivery", [
      {
        id: "delivery-mango-place",
        prompt: "Which object stays at the market table?",
        answers: ["The mangoes", "The water pitchers", "The folded cloth", "The welcome sign"],
        correctIndex: 0,
        skill: "what",
        category: "direct-detail",
        hint: "The first sentence pairs one object with the welcome snack.",
        explanation: "The mangoes stay at the market table for the welcome snack.",
        correctFeedback: "Correct. The mangoes remain at the market table.",
        incorrectFeedback: "That object has another destination. Review the first sentence."
      },
      {
        id: "delivery-cloth-person",
        prompt: "Who should receive the folded cloth?",
        answers: ["Bridge Keeper", "Market Vendor", "Miss Estelle", "Lolo Ambo"],
        correctIndex: 0,
        skill: "who",
        category: "character-setting",
        hint: "The second paragraph names the person who needs the cloth.",
        explanation: "The note says to take the folded cloth to the Bridge Keeper.",
        correctFeedback: "Right. The Bridge Keeper needs the cloth.",
        incorrectFeedback: "Almost! Check the second part of the note."
      },
      {
        id: "delivery-cloth-purpose",
        prompt: "Why does the Bridge Keeper need the cloth?",
        answers: ["To mark a safe waiting place", "To cover the mangoes", "To repair a house", "To wrap the welcome sign"],
        correctIndex: 0,
        skill: "why",
        category: "meaning",
        hint: "The final sentence tells what the cloth will mark.",
        explanation: "The cloth marks the safe waiting place beside the old bridge.",
        correctFeedback: "Correct. The cloth will make the safe waiting place clear.",
        incorrectFeedback: "Almost! Read what the cloth will mark."
      }
    ]),
    completionCondition: "The pitchers are delivered correctly and all note questions are answered.",
    worldResult: "The activity stations now have the correct supplies.",
    reward: "Delivery Stamp",
    nextMissionId: "bridge-safety"
  },
  {
    id: "bridge-safety",
    order: 4,
    npcId: "bridge-keeper",
    location: "old bridge",
    situation: "Readers must cross the old bridge safely on the way to the outdoor reading stop.",
    objective: "Bring the cloth to the Bridge Keeper at the old bridge",
    objectiveHelp: "Go to the old bridge. Talk to the Bridge Keeper.",
    briefing: [
      "This cloth marks the waiting place. We must cross safely.",
      "Read the steps. Choose what to do first."
    ],
    reading: {
      format: "Safety Instructions",
      title: "Crossing the Old Bridge",
      pages: [
        "First, wait on the cloth. Cross when the Bridge Keeper raises a hand. Walk in one line and hold the rail.",
        "Move away after you cross. Give the next reader room. If the path is wet, stop and tell the Bridge Keeper."
      ]
    },
    facts: ["Wait on the cloth first.", "Cross in one line while holding the rail.", "Move away from the entrance after crossing and report a wet path."],
    requiredInteractions: ["Read the safety instructions", "Choose the first bridge action", "Answer every safety question"],
    action: action(
      "bridge-safety",
      "What will you do first at the bridge?",
      ["Wait on the cloth", "Run across alone", "Walk into the forest", "Move away from the far entrance"],
      0,
      "Read the first step. It starts with First.",
      "Correct! The cloth marks the waiting place.",
      "Almost! Read the first step again."
    ),
    questions: questions("bridge-safety", [
      {
        id: "bridge-cross-method",
        prompt: "How should readers cross after the signal?",
        answers: ["In one line while holding the rail", "In pairs while running", "One at a time without the rail", "Across the grass beside the bridge"],
        correctIndex: 0,
        skill: "how",
        category: "sequence-cause",
        hint: "Read the instruction that starts with Next.",
        explanation: "Readers should walk in one line and hold the rail.",
        correctFeedback: "Correct. One line and the rail make the crossing orderly.",
        incorrectFeedback: "Almost! Read how readers should cross."
      },
      {
        id: "bridge-after-crossing",
        prompt: "What should a reader do after reaching the other side?",
        answers: ["Move away from the bridge entrance", "Wait in the middle of the bridge", "Return to the cloth", "Put mangoes on the rail"],
        correctIndex: 0,
        skill: "sequence",
        category: "sequence-cause",
        hint: "The second paragraph starts with the action after crossing.",
        explanation: "Readers move away from the entrance so the next person has room.",
        correctFeedback: "Right. Clearing the entrance helps the next reader cross.",
        incorrectFeedback: "Almost! Read what happens after crossing."
      },
      {
        id: "bridge-wet-path",
        prompt: "Why should a reader stop if the path is wet?",
        answers: ["The Bridge Keeper needs to know about the hazard", "The market order must be changed", "The welcome sign must be moved", "The pitchers need more water"],
        correctIndex: 0,
        skill: "cause-and-effect",
        category: "meaning",
        hint: "Use the final instruction and think about why wet ground matters.",
        explanation: "A wet path can be unsafe, so the Bridge Keeper must be told.",
        correctFeedback: "Correct. Reporting the wet path helps keep the crossing safe.",
        incorrectFeedback: "Almost! Read who must know about the wet path."
      }
    ]),
    completionCondition: "The waiting place is marked, the safe first action is chosen, and all safety questions are answered.",
    worldResult: "The old bridge now has a clear waiting place and crossing routine.",
    reward: "Bridge Pass",
    nextMissionId: "forest-route"
  },
  {
    id: "forest-route",
    order: 5,
    npcId: "bridge-keeper",
    location: "river path",
    situation: "The next reading stop is beyond the bridge.",
    objective: "Ask the Bridge Keeper about the forest route",
    objectiveHelp: "Talk to the Bridge Keeper again. Get the trail guide.",
    briefing: [
      "The bridge is ready. Use this guide to find the outdoor stop.",
      "Look at each landmark. Then choose a path."
    ],
    reading: {
      format: "Trail Guide",
      title: "Route to the Outdoor Reading Stop",
      pages: [
        "Cross the old bridge. Follow the narrow river path. Pass one sunflower. Walk toward the row of trees.",
        "Turn right at the trees. The left path goes to the east homes. The outdoor stop is beyond the trees."
      ]
    },
    facts: ["Follow the river after the bridge.", "Pass one sunflower before the row of trees.", "Turn right at the trees; left leads to the east homes."],
    requiredInteractions: ["Read the trail guide", "Choose the route at the trees", "Answer every route question"],
    action: action(
      "forest-route",
      "Which route will you take at the row of trees?",
      ["Turn right beyond the trees", "Turn left toward the east homes", "Return across the old bridge", "Leave the path at the sunflower"],
      0,
      "Read the second paragraph. Look for right and left.",
      "Correct! You reach the outdoor reading stop.",
      "Almost! Compare the right and left paths."
    ),
    questions: questions("forest-route", [
      {
        id: "forest-first-landmark",
        prompt: "Which landmark comes before the row of trees?",
        answers: ["A single sunflower", "The market table", "The welcome sign", "The east homes"],
        correctIndex: 0,
        skill: "sequence",
        category: "sequence-cause",
        hint: "Trace the route from the bridge through the first paragraph.",
        explanation: "The route passes a single sunflower before reaching the row of trees.",
        correctFeedback: "Correct. The sunflower confirms you are still on the route.",
        incorrectFeedback: "Almost! Find the landmark before the trees."
      },
      {
        id: "forest-left-route",
        prompt: "Where does the left path lead?",
        answers: ["The east homes", "The outdoor reading stop", "The market area", "The central plaza"],
        correctIndex: 0,
        skill: "where",
        category: "character-setting",
        hint: "The guide warns against the left path and names its destination.",
        explanation: "The left path leads toward the east homes.",
        correctFeedback: "Right. The left path returns toward the east homes.",
        incorrectFeedback: "Almost! Read where the left path goes."
      },
      {
        id: "forest-route-evidence",
        prompt: "Which detail best shows you chose the correct route?",
        answers: ["The outdoor stop appears beyond the trees", "The bridge is behind the market", "The pitchers are beside the sunflower", "The welcome sign is in the east homes"],
        correctIndex: 0,
        skill: "inference",
        category: "meaning",
        hint: "Use the final sentence to identify what should appear after the correct turn.",
        explanation: "Finding the outdoor reading stop beyond the trees confirms the right turn was correct.",
        correctFeedback: "Correct. Reaching the stop beyond the trees confirms the route.",
        incorrectFeedback: "Almost! Find what appears after the right turn."
      }
    ]),
    completionCondition: "The correct trail is selected and all route questions are answered.",
    worldResult: "The safe route to the outdoor reading stop is now confirmed.",
    reward: "Trail Marker",
    nextMissionId: "community-finale"
  },
  {
    id: "community-finale",
    order: 6,
    npcId: "miss-estelle",
    location: "central plaza",
    situation: "Miss Estelle is ready to open the reading activity.",
    objective: "Return to Miss Estelle for the final activity message",
    objectiveHelp: "Return to the plaza. Talk to Miss Estelle.",
    briefing: [
      "You prepared every stop. You also made the bridge safe.",
      "Read the final message. Connect the whole journey."
    ],
    reading: {
      format: "Program Message",
      title: "The Community Reading Journey",
      pages: [
        "Readers begin at the plaza welcome sign. Next, they visit the market table. They use the water pitchers at the plaza.",
        "Readers wait on the cloth at the bridge. They cross in one line and hold the rail. Then they pass the sunflower and turn right at the trees.",
        "The plaza, market, bridge, and forest route are ready. Miss Estelle opens the program at the welcome sign."
      ]
    },
    facts: ["The journey starts at the plaza sign.", "The market, bridge, and forest steps happen in order.", "Miss Estelle opens the program after all areas are ready."],
    requiredInteractions: ["Read the program message", "Choose where to begin the program", "Answer every final question"],
    action: action(
      "community-finale",
      "Where will you guide readers to begin the complete journey?",
      ["The welcome sign in the central plaza", "The row of trees", "The far side of the old bridge", "The east homes"],
      0,
      "Find where the journey starts.",
      "Correct! Readers gather at the welcome sign.",
      "Almost! Find where the journey begins."
    ),
    questions: questions("community-finale", [
      {
        id: "final-journey-order",
        prompt: "Which order matches the program message?",
        answers: ["Plaza, market, bridge, forest route", "Market, forest route, plaza, bridge", "Bridge, east homes, market, plaza", "Forest route, bridge, market, east homes"],
        correctIndex: 0,
        skill: "sequence",
        category: "sequence-cause",
        hint: "Trace the journey from the first paragraph into the second.",
        explanation: "Readers begin at the plaza, visit the market, cross the bridge, then follow the forest route.",
        correctFeedback: "Correct. That sequence connects all four prepared areas.",
        incorrectFeedback: "Almost! Follow the journey from the welcome sign."
      },
      {
        id: "final-bridge-rule",
        prompt: "Which safety detail remains important during the complete journey?",
        answers: ["Cross in one line while holding the rail", "Run after passing the sunflower", "Wait at the market table", "Turn left at the row of trees"],
        correctIndex: 0,
        skill: "detail",
        category: "direct-detail",
        hint: "Find the action readers take at the old bridge.",
        explanation: "The final message repeats the instruction to cross in one line while holding the rail.",
        correctFeedback: "Right. The bridge safety rule is part of the final journey.",
        incorrectFeedback: "That is not the bridge safety detail repeated in the message."
      },
      {
        id: "final-ready-condition",
        prompt: "When can the community activity begin?",
        answers: ["When the plaza, market, bridge, and route are ready", "When only the mangoes are packed", "When the left forest path is chosen", "When the pitchers reach the bridge"],
        correctIndex: 0,
        skill: "cause-and-effect",
        category: "meaning",
        hint: "The final paragraph lists the condition for beginning.",
        explanation: "The activity begins after all four parts of the journey are ready.",
        correctFeedback: "Correct. Every prepared part now supports the community activity.",
        incorrectFeedback: "Almost! Find what must be ready."
      },
      {
        id: "final-main-idea",
        prompt: "What is the program message mainly about?",
        answers: ["How the prepared places connect into one reading journey", "Why the market should close early", "How to build a new bridge", "Why readers should stay at the east homes"],
        correctIndex: 0,
        skill: "main-idea",
        category: "meaning",
        hint: "Think about what all three paragraphs explain together.",
        explanation: "The message combines the prepared locations and instructions into one community reading journey.",
        correctFeedback: "Correct. Your work connected every reading and location into one journey.",
        incorrectFeedback: "Almost! Think about how the places connect."
      }
    ]),
    completionCondition: "The correct starting point is chosen and every final question is answered.",
    worldResult: "The community reading activity opens with every station and route ready.",
    reward: "Community Reader Badge",
    nextMissionId: null
  }
];

const MISSIONS_BY_ID = Object.fromEntries(MISSIONS.map((mission) => [mission.id, mission])) as Readonly<Record<MissionId, MissionDefinition>>;
const FILIPINO_MISSIONS = MISSIONS.map(applyFilipinoMissionTranslation);
const FILIPINO_MISSIONS_BY_ID = Object.fromEntries(FILIPINO_MISSIONS.map((mission) => [mission.id, mission])) as Readonly<Record<MissionId, MissionDefinition>>;

export function getMission(missionId: MissionId, language: GameLanguage = "en") {
  return language === "fil" ? FILIPINO_MISSIONS_BY_ID[missionId] : MISSIONS_BY_ID[missionId];
}

export function getMissionByOrder(index: number, language: GameLanguage = "en") {
  return language === "fil" ? FILIPINO_MISSIONS[index] : MISSIONS[index];
}

export function getMissions(language: GameLanguage = "en") {
  return language === "fil" ? FILIPINO_MISSIONS : MISSIONS;
}

export const SKILL_LABELS: Readonly<Record<ComprehensionSkill, string>> = {
  who: "Who",
  what: "What",
  where: "Where",
  how: "How",
  why: "Why",
  "main-idea": "Main idea",
  sequence: "Sequence",
  "cause-and-effect": "Cause and effect",
  detail: "Details",
  inference: "Inference"
};

export const FILIPINO_SKILL_LABELS: Readonly<Record<ComprehensionSkill, string>> = {
  who: "Sino",
  what: "Ano",
  where: "Saan",
  how: "Paano",
  why: "Bakit",
  "main-idea": "Pangunahing ideya",
  sequence: "Pagkakasunod-sunod",
  "cause-and-effect": "Sanhi at bunga",
  detail: "Mga detalye",
  inference: "Hinuha"
};

export function getSkillLabels(language: GameLanguage) {
  return language === "fil" ? FILIPINO_SKILL_LABELS : SKILL_LABELS;
}
