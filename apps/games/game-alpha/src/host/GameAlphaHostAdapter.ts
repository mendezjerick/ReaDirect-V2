export type GameAlphaGameProfile = {
  audience: "learner";
  username: string;
  discriminator: string;
  publicHandle: string;
  isActive: boolean;
};

export type GameAlphaRemoteSave = {
  checkpointKey: string;
  saveSchemaVersion: number;
  state: unknown;
  revision: number;
  savedAt: string;
};

export type GameAlphaSaveRequest = {
  checkpointKey: string;
  saveSchemaVersion: number;
  state: Record<string, unknown>;
  expectedRevision: number;
};

export interface GameAlphaHostAdapter {
  readonly profile: GameAlphaGameProfile | null;
  load(): Promise<GameAlphaRemoteSave | null>;
  save(request: GameAlphaSaveRequest): Promise<GameAlphaRemoteSave>;
  newGame(expectedRevision: number): Promise<void>;
}
