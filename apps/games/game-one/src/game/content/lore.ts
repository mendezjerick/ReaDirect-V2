import type { MissionId } from "./missions";
import type { NpcId } from "./npcs";

type BilingualText = Readonly<Record<"en" | "fil", string>>;

export type LoreAssignment = {
  npcId: NpcId;
  missionId: MissionId;
  task: BilingualText;
  questionIds: readonly string[];
};

// One bounded story team: every character supports a reading decision already in the six missions.
export const LORE_ASSIGNMENTS: readonly LoreAssignment[] = [
  {
    npcId: "miss-estelle",
    missionId: "plaza-welcome",
    task: { en: "Start the reading path at the plaza sign.", fil: "Simulan ang daan sa sign sa plaza." },
    questionIds: ["plaza-start-place", "plaza-next-stop"]
  },
  {
    npcId: "market-vendor",
    missionId: "market-supplies",
    task: { en: "Read the labels and pack the crate in order.", fil: "Basahin ang label at ayusin ang kahon." },
    questionIds: ["market-mango-count", "market-second-item", "market-recipient"]
  },
  {
    npcId: "lolo-ambo",
    missionId: "village-delivery",
    task: { en: "Use the note to place each supply.", fil: "Basahin ang note at ilagay ang gamit." },
    questionIds: ["delivery-mango-place", "delivery-cloth-person", "delivery-cloth-purpose"]
  },
  {
    npcId: "bridge-keeper",
    missionId: "bridge-safety",
    task: { en: "Keep readers safe at the old bridge.", fil: "Panatilihing ligtas ang lahat sa tulay." },
    questionIds: ["bridge-cross-method", "bridge-after-crossing", "bridge-wet-path"]
  },
  {
    npcId: "mang-yato",
    missionId: "forest-route",
    task: { en: "Open the farm gate and show the sunflower.", fil: "Buksan ang gate at ipakita ang sunflower." },
    questionIds: ["forest-first-landmark"]
  },
  {
    npcId: "mang-panda",
    missionId: "forest-route",
    task: { en: "Check the trail sign at the trees.", fil: "Tingnan ang sign sa mga puno." },
    questionIds: ["forest-left-route"]
  },
  {
    npcId: "miss-yuuri",
    missionId: "forest-route",
    task: { en: "Bring books to the outdoor reading stop.", fil: "Dalhin ang libro sa outdoor reading stop." },
    questionIds: ["forest-route-evidence"]
  },
  {
    npcId: "mr-kikushibu",
    missionId: "community-finale",
    task: { en: "Tell the Lost Kingdom story.", fil: "Ikuwento ang Lost Kingdom." },
    questionIds: ["final-kingdom-story"]
  }
];

export function getLoreAssignments(missionId: MissionId) {
  return LORE_ASSIGNMENTS.filter((assignment) => assignment.missionId === missionId);
}
