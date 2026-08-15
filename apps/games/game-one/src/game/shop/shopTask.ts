import type { GameLanguage } from "../localization/language";
import type { Point } from "../physics/collision";

export type ShopTaskStage = "not-started" | "searching" | "paper-found" | "completed";

export type ShopInteractionId =
  | "market-vendor"
  | "story-shelf"
  | "map-shelf"
  | "reading-table"
  | "apple-display"
  | "herb-display"
  | "berry-display"
  | "corn-display";

export type ShopInteractionTarget = {
  id: ShopInteractionId;
  position: Point;
  label: Record<GameLanguage, string>;
  action: Record<GameLanguage, string>;
};

export type ShopTaskState = {
  stage: ShopTaskStage;
  hintUsed: boolean;
  inspectedIds: ShopInteractionId[];
};

export type ShopDialogue = {
  speaker: Record<GameLanguage, string>;
  pages: Record<GameLanguage, readonly string[]>;
};

export type ShopInteractionResult = {
  nextState: ShopTaskState;
  dialogue: ShopDialogue;
};

export const SHOP_INTERACTION_TARGETS: readonly ShopInteractionTarget[] = [
  {
    id: "market-vendor",
    position: { x: 320, y: 220 },
    label: { en: "Market Vendor", fil: "Tindero" },
    action: { en: "Talk", fil: "Kausapin" }
  },
  {
    id: "story-shelf",
    position: { x: 128, y: 194 },
    label: { en: "Story Shelf", fil: "Story Shelf" },
    action: { en: "Read", fil: "Basahin" }
  },
  {
    id: "map-shelf",
    position: { x: 512, y: 194 },
    label: { en: "Map Shelf", fil: "Map Shelf" },
    action: { en: "Check", fil: "Tingnan" }
  },
  {
    id: "reading-table",
    position: { x: 320, y: 344 },
    label: { en: "Reading Table", fil: "Reading Table" },
    action: { en: "Read clue", fil: "Basahin ang clue" }
  },
  {
    id: "apple-display",
    position: { x: 128, y: 304 },
    label: { en: "Apples", fil: "Mansanas" },
    action: { en: "Read label", fil: "Basahin" }
  },
  {
    id: "herb-display",
    position: { x: 512, y: 304 },
    label: { en: "Green Herbs", fil: "Green Herbs" },
    action: { en: "Read label", fil: "Basahin" }
  },
  {
    id: "berry-display",
    position: { x: 128, y: 410 },
    label: { en: "Berries", fil: "Berries" },
    action: { en: "Read label", fil: "Basahin" }
  },
  {
    id: "corn-display",
    position: { x: 512, y: 410 },
    label: { en: "Corn", fil: "Mais" },
    action: { en: "Read label", fil: "Basahin" }
  }
] as const;

const copy = {
  en: {
    objectiveLabel: "SHOP TASK",
    objectives: {
      "not-started": "Talk to the Market Vendor.",
      searching: "Find the map paper above the green herbs.",
      "paper-found": "Bring the map paper to the Market Vendor.",
      completed: "Shop task complete. Follow the river path."
    }
  },
  fil: {
    objectiveLabel: "SHOP TASK",
    objectives: {
      "not-started": "Kausapin ang tindero.",
      searching: "Hanapin ang map paper sa taas ng green herbs.",
      "paper-found": "Dalhin ang map paper sa tindero.",
      completed: "Tapos na. Sundan ang daan sa ilog."
    }
  }
} as const;

export function createInitialShopTaskState(): ShopTaskState {
  return {
    stage: "not-started",
    hintUsed: false,
    inspectedIds: []
  };
}

export function getShopTaskObjective(state: ShopTaskState, language: GameLanguage) {
  return {
    label: copy[language].objectiveLabel,
    text: copy[language].objectives[state.stage]
  };
}

export function getShopActionLabel(target: ShopInteractionTarget, language: GameLanguage) {
  return `${target.action[language]} ${target.label[language]}`;
}

export function getNearestShopInteractionTarget(position: Point, maximumDistance = 54) {
  let nearest: ShopInteractionTarget | null = null;
  let nearestDistance = maximumDistance;
  for (const target of SHOP_INTERACTION_TARGETS) {
    const distance = Math.hypot(position.x - target.position.x, position.y - target.position.y);
    if (distance <= nearestDistance) {
      nearest = target;
      nearestDistance = distance;
    }
  }
  return nearest;
}

export function interactWithShopTarget(
  state: ShopTaskState,
  targetId: ShopInteractionId
): ShopInteractionResult {
  const inspectedState = markInspected(state, targetId);

  if (targetId === "market-vendor") {
    return interactWithVendor(inspectedState);
  }

  if (targetId === "map-shelf") {
    if (state.stage === "searching") {
      return {
        nextState: { ...inspectedState, stage: "paper-found" },
        dialogue: dialogue(
          "Map Shelf",
          "Map Shelf",
          ["You found the waterproof map paper.", "Take it back to the Market Vendor."],
          ["Nahanap mo ang waterproof map paper.", "Dalhin ito sa tindero."]
        )
      };
    }
    if (state.stage === "not-started") {
      return {
        nextState: inspectedState,
        dialogue: dialogue(
          "Map Shelf",
          "Map Shelf",
          ["Map paper is stacked here.", "Talk to the Market Vendor first."],
          ["Nandito ang map paper.", "Kausapin muna ang tindero."]
        )
      };
    }
    return {
      nextState: inspectedState,
      dialogue: dialogue(
        "Map Shelf",
        "Map Shelf",
        ["The waterproof map paper came from this shelf."],
        ["Dito galing ang waterproof map paper."]
      )
    };
  }

  if (targetId === "reading-table") {
    return interactWithReadingTable(inspectedState);
  }

  if (targetId === "story-shelf") {
    return {
      nextState: inspectedState,
      dialogue: dialogue(
        "River Story",
        "Kuwento sa Ilog",
        [
          "Rain damaged the old village map.",
          "Waterproof paper can keep the new map safe."
        ],
        [
          "Nasira ng ulan ang lumang mapa.",
          "Map paper na waterproof ang kailangan."
        ]
      )
    };
  }

  const displayCopy = {
    "apple-display": {
      en: ["APPLES", "This is not the green herb display."],
      fil: ["MANSANAS", "Hindi ito ang green herbs."]
    },
    "herb-display": {
      en: ["GREEN HERBS", "Look at the shelf above this display."],
      fil: ["GREEN HERBS", "Tingnan ang shelf sa taas nito."]
    },
    "berry-display": {
      en: ["BERRIES", "The clue says green herbs."],
      fil: ["BERRIES", "Green herbs ang nasa clue."]
    },
    "corn-display": {
      en: ["CORN", "The clue says green herbs."],
      fil: ["MAIS", "Green herbs ang nasa clue."]
    }
  } as const;
  const display = displayCopy[targetId];
  return {
    nextState: inspectedState,
    dialogue: dialogue(display.en[0], display.fil[0], display.en, display.fil)
  };
}

function interactWithVendor(state: ShopTaskState): ShopInteractionResult {
  if (state.stage === "not-started") {
    return {
      nextState: { ...state, stage: "searching" },
      dialogue: dialogue(
        "Market Vendor",
        "Tindero",
        [
          "Lolo Ambo needs waterproof map paper.",
          "Find it above the green herbs."
        ],
        [
          "Kailangan ni Lolo Ambo ng waterproof map paper.",
          "Hanapin ito sa taas ng green herbs."
        ]
      )
    };
  }
  if (state.stage === "searching") {
    return {
      nextState: state,
      dialogue: dialogue(
        "Market Vendor",
        "Tindero",
        ["Find the map paper above the green herbs."],
        ["Hanapin ang map paper sa taas ng green herbs."]
      )
    };
  }
  if (state.stage === "paper-found") {
    return {
      nextState: { ...state, stage: "completed" },
      dialogue: dialogue(
        "Market Vendor",
        "Tindero",
        [
          "That is the waterproof map paper.",
          "It will keep Lolo Ambo's map safe.",
          "Take the east path to the Bridge Keeper."
        ],
        [
          "Iyan ang waterproof map paper.",
          "Hindi na mababasa ang mapa ni Lolo Ambo.",
          "Dumaan sa east path papunta sa Bridge Keeper."
        ]
      )
    };
  }
  return {
    nextState: state,
    dialogue: dialogue(
      "Market Vendor",
      "Tindero",
      ["The Bridge Keeper is waiting on the east path."],
      ["Naghihintay ang Bridge Keeper sa east path."]
    )
  };
}

function interactWithReadingTable(state: ShopTaskState): ShopInteractionResult {
  if (state.stage === "not-started") {
    return {
      nextState: state,
      dialogue: dialogue(
        "Reading Table",
        "Reading Table",
        ["The clue card is blank.", "Talk to the Market Vendor first."],
        ["Wala pang clue.", "Kausapin muna ang tindero."]
      )
    };
  }
  if (state.stage === "searching") {
    return {
      nextState: { ...state, hintUsed: true },
      dialogue: dialogue(
        "Clue Card",
        "Clue Card",
        ["Find the map paper above the green herbs."],
        ["Hanapin ang map paper sa taas ng green herbs."]
      )
    };
  }
  if (state.stage === "paper-found") {
    return {
      nextState: state,
      dialogue: dialogue(
        "Clue Card",
        "Clue Card",
        ["Return the map paper to the Market Vendor."],
        ["Ibalik ang map paper sa tindero."]
      )
    };
  }
  return {
    nextState: state,
    dialogue: dialogue(
      "Clue Card",
      "Clue Card",
      ["Take the east path to the Bridge Keeper."],
      ["Dumaan sa east path papunta sa Bridge Keeper."]
    )
  };
}

function markInspected(state: ShopTaskState, targetId: ShopInteractionId): ShopTaskState {
  if (state.inspectedIds.includes(targetId)) return state;
  return {
    ...state,
    inspectedIds: [...state.inspectedIds, targetId]
  };
}

function dialogue(
  speakerEn: string,
  speakerFil: string,
  pagesEn: readonly string[],
  pagesFil: readonly string[]
): ShopDialogue {
  return {
    speaker: { en: speakerEn, fil: speakerFil },
    pages: { en: pagesEn, fil: pagesFil }
  };
}
