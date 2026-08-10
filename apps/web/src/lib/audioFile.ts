function audioExtension(audio: Blob): string {
  const mimeType = audio.type.toLowerCase();

  if (mimeType.includes("mp4") || mimeType.includes("mpeg")) {
    return "m4a";
  }

  if (mimeType.includes("ogg")) {
    return "ogg";
  }

  if (mimeType.includes("wav")) {
    return "wav";
  }

  return "webm";
}

export function audioFilename(baseName: string, audio: Blob): string {
  return `${baseName}.${audioExtension(audio)}`;
}
