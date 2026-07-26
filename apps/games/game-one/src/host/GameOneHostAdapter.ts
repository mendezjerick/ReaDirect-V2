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
  load(): Promise<GameOneRemoteSave | null>;
  save(request: GameOneSaveRequest): Promise<GameOneRemoteSave>;
  reset(expectedRevision: number): Promise<void>;
}
