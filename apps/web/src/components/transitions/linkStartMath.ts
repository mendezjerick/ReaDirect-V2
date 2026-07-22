const LINK_START_WARP_START_MS = 120;
const LINK_START_STREAK_DELAY_SPAN_MS = 620;
const LINK_START_STREAK_TRAVEL_MS = 2260;
const LINK_START_STREAK_WAVE_INTERVAL_MS = 850;

export const LINK_START_COVER_COMPLETE_MS = 2525;
export const LINK_START_STREAK_COLOR_COUNT = 6;

export interface LinkStartStreak {
  angle: number;
  colorIndex: number;
  delay: number;
  length: number;
  offset: number;
  speed: number;
  width: number;
}

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function getStreakCount(width: number): number {
  if (width < 768) {
    return 96;
  }

  if (width < 1024) {
    return 140;
  }

  return 192;
}

export function createLinkStartStreaks(width: number): LinkStartStreak[] {
  const random = createSeededRandom(20_260_719);

  return Array.from({ length: getStreakCount(width) }, (_, index) => ({
    angle: random() * Math.PI * 2,
    colorIndex: index % LINK_START_STREAK_COLOR_COUNT,
    delay: random(),
    length: 78 + random() * 260,
    offset: random() * 0.16,
    speed: 0.8 + random() * 0.42,
    width: 3.5 + random() * 11.5,
  }));
}

export function getLinkStartWaveProgresses(
  elapsed: number,
  delay: number,
): number[] {
  if (elapsed >= LINK_START_COVER_COMPLETE_MS) {
    return [];
  }

  const firstWaveStart =
    LINK_START_WARP_START_MS + delay * LINK_START_STREAK_DELAY_SPAN_MS;
  const progresses: number[] = [];

  for (
    let waveStart = firstWaveStart;
    waveStart < elapsed;
    waveStart += LINK_START_STREAK_WAVE_INTERVAL_MS
  ) {
    const progress = (elapsed - waveStart) / LINK_START_STREAK_TRAVEL_MS;

    if (progress > 0 && progress < 1) {
      progresses.push(progress);
    }
  }

  return progresses;
}
