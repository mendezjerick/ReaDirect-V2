export type GameOneRemoteSave = {
  checkpointKey: string;
  saveSchemaVersion: number;
  state: unknown;
  revision: number;
  savedAt: string;
};

export type GameOneSaveRequest = {
  checkpointKey: string;
  saveSchemaVersion: number;
  state: Record<string, unknown>;
  expectedRevision: number;
};

export interface GameOneHostAdapter {
  readonly profile: GameOneGameProfile | null;
  load(): Promise<GameOneRemoteSave | null>;
  save(request: GameOneSaveRequest): Promise<GameOneRemoteSave>;
  newGame(expectedRevision: number): Promise<void>;
}
export type GameOneGameProfile = {
  audience: "learner";
  username: string;
  discriminator: string;
  publicHandle: string;
  isActive: boolean;
};
