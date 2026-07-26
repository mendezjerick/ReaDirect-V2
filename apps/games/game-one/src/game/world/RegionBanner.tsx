import type { GameLanguage } from "../localization/language";
import { getWorldRegionLabel, type WorldRegionId } from "./worldRegions";

export function RegionBanner({ regionId, language }: { regionId: WorldRegionId; language: GameLanguage }) {
  return (
    <div className="region-banner" data-region={regionId} role="status" aria-live="polite">
      <span className="region-banner-code" aria-hidden="true">{getRegionCode(regionId)}</span>
      <span className="region-banner-copy">
        <span>{language === "fil" ? "Pumasok sa" : "Entering"}</span>
        <strong>{getWorldRegionLabel(regionId, language)}</strong>
      </span>
      <span className="region-banner-signal" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    </div>
  );
}

function getRegionCode(regionId: WorldRegionId) {
  return {
    village: "VL",
    forest: "FR",
    river: "RV",
    farm: "FM",
    jungle: "JG",
    waterfall: "WF"
  }[regionId];
}
