export interface RandomSource {
  next(): number;
}

export class SeededRandom implements RandomSource {
  private state: number;

  constructor(seed = 0x41_4c_50_48) {
    this.state = seed >>> 0 || 1;
  }

  next(): number {
    let value = this.state;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    this.state = value >>> 0;
    return this.state / 0x1_0000_0000;
  }
}

export function randomInt(
  random: RandomSource,
  minimum: number,
  maximumInclusive: number,
): number {
  return minimum + Math.floor(random.next() * (maximumInclusive - minimum + 1));
}
