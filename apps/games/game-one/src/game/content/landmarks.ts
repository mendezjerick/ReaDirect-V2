import { MAP_DECORATION_LANDMARKS } from "../map/prototypeMap";
import type { Point } from "../physics/collision";

export const LANDMARK_IDS = [
  "village-guide-sign",
  "learning-hall-notice",
  "reading-shrine",
  "farm-gate-sign",
  "shrine-boat-warning-sign"
] as const;

export type LandmarkId = (typeof LANDMARK_IDS)[number];

export type LandmarkDefinition = {
  id: LandmarkId;
  displayName: Readonly<Record<"en" | "fil", string>>;
  roleTitle: Readonly<Record<"en" | "fil", string>>;
  interactionLabel: string;
  position: Point;
  indicatorPosition: Point;
  pages: Readonly<Record<"en" | "fil", readonly string[]>>;
};

export const LANDMARKS: readonly LandmarkDefinition[] = [
  {
    id: "village-guide-sign",
    displayName: { en: "Village Guide Sign", fil: "Guide Sign ng Baryo" },
    roleTitle: { en: "Village Landmark", fil: "Palatandaan sa Baryo" },
    interactionLabel: "Read the village guide sign",
    ...MAP_DECORATION_LANDMARKS.villageGuideSign,
    pages: {
      en: [
        "Reading Hall: west. Market: south. River path: east.",
        "Follow the signs and keep the paths clear."
      ],
      fil: [
        "Reading Hall: kaliwa. Market: baba. River path: kanan.",
        "Sundan ang mga sign at huwag harangan ang daan."
      ]
    }
  },
  {
    id: "learning-hall-notice",
    displayName: { en: "Reading Hall Notice", fil: "Notice sa Reading Hall" },
    roleTitle: { en: "Community Notice", fil: "Notice ng Baryo" },
    interactionLabel: "Read the hall notice",
    ...MAP_DECORATION_LANDMARKS.learningHallNotice,
    pages: {
      en: [
        "Short stories are ready inside.",
        "Please return each book after reading."
      ],
      fil: [
        "May maiikling story sa loob.",
        "Ibalik ang bawat book pagkatapos basahin."
      ]
    }
  },
  {
    id: "reading-shrine",
    displayName: { en: "Readers' Shrine", fil: "Shrine ng mga Reader" },
    roleTitle: { en: "Quiet Reading Place", fil: "Tahimik na Lugar" },
    interactionLabel: "Read the shrine message",
    ...MAP_DECORATION_LANDMARKS.readingShrine,
    pages: {
      en: [
        "This shrine remembers every reader who followed the old map.",
        "The open book means that every story can guide someone."
      ],
      fil: [
        "Inaalala ng shrine ang bawat reader na sumunod sa lumang mapa.",
        "Ang bukas na book ay tanda na may gabay sa bawat story."
      ]
    }
  },
  {
    id: "farm-gate-sign",
    displayName: { en: "Farm Gate Sign", fil: "Sign sa Gate ng Farm" },
    roleTitle: { en: "Farm Guide", fil: "Guide sa Farm" },
    interactionLabel: "Read the farm gate sign",
    ...MAP_DECORATION_LANDMARKS.farmGateSign,
    pages: {
      en: [
        "The farm gate leads to the woodland trail.",
        "Follow the sunflower markers and keep the path clear."
      ],
      fil: [
        "Ang gate ng farm ay papunta sa woodland trail.",
        "Sundan ang sunflower at huwag harangan ang daan."
      ]
    }
  },
  {
    id: "shrine-boat-warning-sign",
    displayName: { en: "Boat Safety Sign", fil: "Sign sa Kaligtasan ng Bangka" },
    roleTitle: { en: "Shrine Warning", fil: "Babala sa Shrine" },
    interactionLabel: "Read the boat warning sign",
    ...MAP_DECORATION_LANDMARKS.shrineBoatWarningSign,
    pages: {
      en: ["Do not leave your boat near the shrine, or you will lose it forever."],
      fil: ["Huwag iwan ang bangka malapit sa shrine, o mawawala ito nang tuluyan."]
    }
  }
];

export function getLandmark(landmarkId: LandmarkId) {
  return LANDMARKS.find((landmark) => landmark.id === landmarkId)!;
}
