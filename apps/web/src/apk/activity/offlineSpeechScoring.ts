function normalizeSpeech(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function editDistance(left: string[], right: string[]): number {
  const previous = Array.from(
    { length: right.length + 1 },
    (_, index) => index,
  );
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] +
          (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
}

export function scoreOfflineSpeech(
  transcript: string,
  expected: string,
  long: boolean,
): { correct: boolean; similarity: number } {
  const actualTokens = normalizeSpeech(transcript).split(" ").filter(Boolean);
  const expectedTokens = normalizeSpeech(expected).split(" ").filter(Boolean);
  if (actualTokens.length === 0 || expectedTokens.length === 0) {
    return { correct: false, similarity: 0 };
  }

  const distance = editDistance(actualTokens, expectedTokens);
  const similarity = Math.max(
    0,
    1 - distance / Math.max(actualTokens.length, expectedTokens.length),
  );
  const threshold = long ? 0.55 : expectedTokens.length >= 5 ? 0.7 : 0.8;
  return { correct: similarity >= threshold, similarity };
}
