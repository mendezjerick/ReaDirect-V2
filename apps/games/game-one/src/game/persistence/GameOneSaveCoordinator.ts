import type {
  GameOneHostAdapter,
  GameOneSaveRequest
} from "../../host/GameOneHostAdapter";

type PendingSave = Omit<GameOneSaveRequest, "expectedRevision">;

export class GameOneSaveCoordinator {
  private revision: number;
  private pending: PendingSave | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private writeChain: Promise<void> = Promise.resolve();
  private failed = false;

  constructor(
    private readonly host: GameOneHostAdapter,
    initialRevision: number,
    private readonly onError: (error: Error) => void,
    private readonly debounceMilliseconds = 600
  ) {
    this.revision = initialRevision;
  }

  schedule(save: PendingSave): void {
    if (this.failed) return;
    this.pending = save;
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush().catch(() => undefined);
    }, this.debounceMilliseconds);
  }

  flush(): Promise<void> {
    if (this.failed || this.pending === null) return this.writeChain;
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    const pending = this.pending;
    this.pending = null;
    this.writeChain = this.writeChain
      .then(async () => {
        const saved = await this.host.save({
          ...pending,
          expectedRevision: this.revision
        });
        this.revision = saved.revision;
      })
      .catch((reason: unknown) => {
        this.failed = true;
        const error = reason instanceof Error
          ? reason
          : new Error("Game One progress could not be saved.");
        this.onError(error);
        throw error;
      });

    return this.writeChain;
  }

  async reset(): Promise<void> {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.pending = null;
    await this.writeChain;
    try {
      await this.host.reset(this.revision);
      this.revision = 0;
      this.failed = false;
    } catch (reason: unknown) {
      this.failed = true;
      const error = reason instanceof Error
        ? reason
        : new Error("Game One progress could not be reset.");
      this.onError(error);
      throw error;
    }
  }

  getRevision(): number {
    return this.revision;
  }
}
