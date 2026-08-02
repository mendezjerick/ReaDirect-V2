import { MAP_LANDMARKS } from "../map/prototypeMap";
import type { Point } from "../physics/collision";

export const SHOP_IDS = ["market-shop"] as const;

export type ShopId = (typeof SHOP_IDS)[number];

export type ShopDefinition = {
  id: ShopId;
  displayName: Readonly<Record<"en" | "fil", string>>;
  interactionLabel: Readonly<Record<"en" | "fil", string>>;
  description: Readonly<Record<"en" | "fil", string>>;
  entrancePosition: Point;
  indicatorPosition: Point;
};

export const SHOPS: readonly ShopDefinition[] = [
  {
    id: "market-shop",
    displayName: { en: "River Market", fil: "Tindahan sa Ilog" },
    interactionLabel: { en: "Enter River Market", fil: "Pumasok sa Tindahan" },
    description: { en: "Enter the River Market.", fil: "Pumasok sa Tindahan sa Ilog." },
    entrancePosition: MAP_LANDMARKS.marketFront,
    indicatorPosition: { x: MAP_LANDMARKS.marketFront.x, y: MAP_LANDMARKS.marketFront.y - 34 }
  }
];

export function getShop(shopId: ShopId) {
  return SHOPS.find((shop) => shop.id === shopId)!;
}
