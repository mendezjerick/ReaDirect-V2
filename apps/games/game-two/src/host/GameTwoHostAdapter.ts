export type GameTwoGameProfile = {
  audience: "learner";
  username: string;
  discriminator: string;
  publicHandle: string;
  isActive: boolean;
};

export type GameTwoRemoteSave = {
  checkpointKey: string;
  saveSchemaVersion: number;
  state: unknown;
  revision: number;
  savedAt: string;
};

export type GameTwoSaveRequest = {
  checkpointKey: string;
  saveSchemaVersion: number;
  state: Record<string, unknown>;
  expectedRevision: number;
};

export interface GameTwoHostAdapter {
  readonly profile: GameTwoGameProfile | null;
  load(): Promise<GameTwoRemoteSave | null>;
  save(request: GameTwoSaveRequest): Promise<GameTwoRemoteSave>;
  newGame(expectedRevision: number): Promise<void>;
}
