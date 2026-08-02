import { randomInt, SeededRandom, type RandomSource } from "./random";
import {
  addScore,
  challengeBonus,
  CHALLENGE_TARGET_COUNT,
  EXTRA_HEART_INCREMENT,
  INITIAL_HEARTS,
  isChallengeStage,
  MINIMUM_HIGH_SCORE,
  nextStage,
  resolveShipDamage,
  scoreForEnemy,
  visibleStage,
  type StageCursor,
} from "./rules";
import {
  STAGE_HEIGHT,
  STAGE_WIDTH,
  type AlphabetAllyState,
  type AudioCue,
  type DeathCause,
  type EnemyKind,
  type EnemyState,
  type GamePhase,
  type GameSnapshot,
  type PlayerState,
  type ProjectileState,
} from "./types";

const PLAYER_Y = 424;
const PLAYER_SPEED = 155;
const PLAYER_FIRE_COOLDOWN_MS = 210;
const PLAYER_PROJECTILE_SPEED = 310;
const ENEMY_PROJECTILE_SPEED = 120;
const INTRO_DURATION_MS = 2_100;
const DEATH_DURATION_MS = 1_800;
const WAVE_CLEAR_DURATION_MS = 1_600;
const RESPAWN_INVULNERABILITY_MS = 1_500;
const FORMATION_PULSE_MS = 650;
const LOW_HEART_PULSE_MS = 800;

interface ModelOptions {
  seed?: number;
  highScore?: number;
  random?: RandomSource;
}

interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class GameAlphaModel {
  private readonly random: RandomSource;
  private stageCursor: StageCursor = { pattern: 1, offset: 0 };
  private phase: GamePhase = "wave-intro";
  private paused = false;
  private phaseElapsedMs = 0;
  private totalElapsedMs = 0;
  private fireCooldownMs = 0;
  private formationPulseMs = 0;
  private lowHeartPulseMs = 0;
  private nextDiveMs = 1_500;
  private moveDirection: -1 | 0 | 1 = 0;
  private pointerTargetX: number | null = null;
  private nextEntityId = 1;
  private score = 0;
  private highScore: number;
  private hearts = INITIAL_HEARTS;
  private nextExtraHeartAt = EXTRA_HEART_INCREMENT;
  private challengeHits = 0;
  private audioCues: AudioCue[] = [];
  private player: PlayerState = this.createPlayer();
  private enemies: EnemyState[] = [];
  private ally: AlphabetAllyState = this.createPlaceholderAlly();
  private projectiles: ProjectileState[] = [];

  constructor(options: ModelOptions = {}) {
    this.random = options.random ?? new SeededRandom(options.seed);
    this.highScore = Math.max(options.highScore ?? 0, MINIMUM_HIGH_SCORE);
    this.startWave();
  }

  restart(): void {
    this.stageCursor = { pattern: 1, offset: 0 };
    this.phase = "wave-intro";
    this.paused = false;
    this.phaseElapsedMs = 0;
    this.totalElapsedMs = 0;
    this.fireCooldownMs = 0;
    this.score = 0;
    this.hearts = INITIAL_HEARTS;
    this.nextExtraHeartAt = EXTRA_HEART_INCREMENT;
    this.challengeHits = 0;
    this.player = this.createPlayer();
    this.projectiles = [];
    this.audioCues = [];
    this.startWave();
  }

  update(deltaMs: number): void {
    if (this.paused || this.phase === "game-over") return;

    const stepMs = Math.min(Math.max(deltaMs, 0), 50);
    this.phaseElapsedMs += stepMs;
    this.totalElapsedMs += stepMs;
    this.fireCooldownMs = Math.max(0, this.fireCooldownMs - stepMs);
    this.player.invulnerableMs = Math.max(
      0,
      this.player.invulnerableMs - stepMs,
    );

    this.updateLowHeartWarning(stepMs);

    if (this.phase === "player-death") {
      this.updateDeath();
      return;
    }

    if (this.phase === "wave-clear") {
      if (this.phaseElapsedMs >= WAVE_CLEAR_DURATION_MS) {
        this.stageCursor = nextStage(this.stageCursor);
        this.startWave();
      }
      return;
    }

    this.updatePlayer(stepMs);

    if (this.phase === "wave-intro") {
      this.updateIntro();
    } else if (this.isChallenge()) {
      this.updateChallenge(stepMs);
    } else {
      this.updateFormation(stepMs);
      this.updateEnemies(stepMs);
    }

    this.updateProjectiles(stepMs);
    this.resolveCollisions();
    this.removeInactiveProjectiles();
    this.checkWaveComplete();
  }

  setMoveDirection(direction: -1 | 0 | 1): void {
    this.moveDirection = direction;
    if (direction !== 0) this.pointerTargetX = null;
  }

  movePlayerTo(x: number): void {
    this.pointerTargetX = Math.max(0, Math.min(STAGE_WIDTH, x));
    this.moveDirection = 0;
  }

  fire(): boolean {
    if (
      this.paused ||
      this.phase !== "active" ||
      !this.player.visible ||
      this.fireCooldownMs > 0
    ) {
      return false;
    }

    const offsets = this.player.dual ? [-7, 7] : [0];
    for (const offset of offsets) {
      this.projectiles.push({
        id: this.nextId(),
        owner: "player",
        x: this.player.x + this.player.width / 2 - 1 + offset,
        y: this.player.y - 6,
        width: 2,
        height: 8,
        vx: 0,
        vy: -PLAYER_PROJECTILE_SPEED,
        active: true,
        charged: false,
      });
    }

    this.fireCooldownMs = PLAYER_FIRE_COOLDOWN_MS;
    this.emit("player-shot");
    return true;
  }

  togglePause(): boolean {
    if (this.phase === "game-over") return false;
    this.paused = !this.paused;
    return this.paused;
  }

  setPaused(paused: boolean): void {
    if (this.phase !== "game-over") this.paused = paused;
  }

  drainAudioCues(): AudioCue[] {
    const cues = this.audioCues;
    this.audioCues = [];
    return cues;
  }

  getSnapshot(): GameSnapshot {
    return {
      phase: this.phase,
      paused: this.paused,
      stage: visibleStage(this.stageCursor),
      score: this.score,
      highScore: this.highScore,
      hearts: this.hearts,
      nextExtraHeartAt: this.nextExtraHeartAt,
      challenge: this.isChallenge(),
      challengeHits: this.challengeHits,
      protectedLetter: this.ally.letter,
      player: this.player,
      enemies: this.enemies,
      ally: this.ally,
      projectiles: this.projectiles,
    };
  }

  private startWave(): void {
    this.phase = "wave-intro";
    this.phaseElapsedMs = 0;
    this.challengeHits = 0;
    this.formationPulseMs = 0;
    this.lowHeartPulseMs = 0;
    this.nextDiveMs = this.randomRange(1_000, 2_000);
    this.projectiles = [];
    this.player.visible = true;
    this.player.x = STAGE_WIDTH / 2 - this.player.width / 2;
    this.player.invulnerableMs = RESPAWN_INVULNERABILITY_MS;
    this.createWaveEntities();
  }

  private createWaveEntities(): void {
    const slots = this.createFormationSlots();
    const allySlotIndex = randomInt(this.random, 0, slots.length - 1);
    const allySlot = slots[allySlotIndex];
    const letter = String.fromCharCode(65 + randomInt(this.random, 0, 25));
    const challenge = this.isChallenge();

    this.ally = {
      id: this.nextId(),
      letter,
      x: allySlot.x,
      y: -24,
      width: 16,
      height: 16,
      homeX: allySlot.x,
      homeY: allySlot.y,
      active: true,
      escaped: false,
      challengeDelayMs: allySlotIndex * 115,
    };

    this.enemies = slots
      .filter((_, index) => index !== allySlotIndex)
      .map((slot, index) => {
        const kind = this.enemyKindFor(slot.row, index);
        const commander = kind === "commander";
        return {
          id: this.nextId(),
          kind,
          mode: challenge ? "challenge" : "entering",
          x: index % 2 === 0 ? -22 : STAGE_WIDTH + 22,
          y: -30 - (index % 8) * 5,
          width: commander ? 18 : 15,
          height: commander ? 16 : 14,
          homeX: slot.x,
          homeY: slot.y,
          hp: commander ? 2 : 1,
          maxHp: commander ? 2 : 1,
          active: true,
          capturedFighter: false,
          escortLeaderId: null,
          escortCount: 0,
          diveProgress: 0,
          diveOriginX: slot.x,
          hasFired: false,
          challengeDelayMs: index * 115,
        } satisfies EnemyState;
      });

    if (this.enemies.length !== CHALLENGE_TARGET_COUNT) {
      throw new Error(
        `Game Alpha wave must contain ${CHALLENGE_TARGET_COUNT} enemies.`,
      );
    }
  }

  private createFormationSlots(): Array<{ x: number; y: number; row: number }> {
    const rowCounts = [8, 8, 9, 8, 8];
    const slots: Array<{ x: number; y: number; row: number }> = [];

    rowCounts.forEach((count, row) => {
      const spacing = 27;
      const rowWidth = (count - 1) * spacing;
      const startX = (STAGE_WIDTH - rowWidth) / 2;
      for (let column = 0; column < count; column += 1) {
        slots.push({ x: startX + column * spacing, y: 65 + row * 25, row });
      }
    });

    return slots;
  }

  private enemyKindFor(row: number, index: number): EnemyKind {
    if (row === 0 && index % 2 === 0) return "commander";
    if (row <= 1) return "striker";
    return "scout";
  }

  private updateIntro(): void {
    const progress = Math.min(1, this.phaseElapsedMs / INTRO_DURATION_MS);
    const eased = 1 - Math.pow(1 - progress, 3);

    for (const enemy of this.enemies) {
      if (!enemy.active || enemy.mode === "challenge") continue;
      enemy.x += (enemy.homeX - enemy.x) * Math.min(1, eased * 0.12 + 0.03);
      enemy.y += (enemy.homeY - enemy.y) * Math.min(1, eased * 0.12 + 0.03);
    }

    this.ally.x +=
      (this.ally.homeX - this.ally.x) * Math.min(1, eased * 0.12 + 0.03);
    this.ally.y +=
      (this.ally.homeY - this.ally.y) * Math.min(1, eased * 0.12 + 0.03);

    if (progress >= 1) {
      this.phase = "active";
      this.phaseElapsedMs = 0;
      for (const enemy of this.enemies) {
        if (enemy.mode !== "challenge") {
          enemy.mode = "formation";
          enemy.x = enemy.homeX;
          enemy.y = enemy.homeY;
        }
      }
      this.ally.x = this.ally.homeX;
      this.ally.y = this.ally.homeY;
    }
  }

  private updatePlayer(deltaMs: number): void {
    if (!this.player.visible) return;

    if (this.pointerTargetX !== null) {
      const desiredX = this.pointerTargetX - this.player.width / 2;
      const difference = desiredX - this.player.x;
      const maximumMove = (PLAYER_SPEED * 1.5 * deltaMs) / 1_000;
      this.player.x +=
        Math.sign(difference) * Math.min(Math.abs(difference), maximumMove);
    } else {
      this.player.x += (this.moveDirection * PLAYER_SPEED * deltaMs) / 1_000;
    }

    this.player.x = Math.max(
      3,
      Math.min(STAGE_WIDTH - this.player.width - 3, this.player.x),
    );
  }

  private updateFormation(deltaMs: number): void {
    this.formationPulseMs += deltaMs;
    if (this.formationPulseMs >= FORMATION_PULSE_MS) {
      this.formationPulseMs %= FORMATION_PULSE_MS;
      this.emit("formation-pulse");
    }

    const sway = Math.sin(this.totalElapsedMs / 620) * 8;
    for (const enemy of this.enemies) {
      if (enemy.active && enemy.mode === "formation") {
        enemy.x = enemy.homeX + sway;
        enemy.y =
          enemy.homeY + Math.sin(this.totalElapsedMs / 440 + enemy.id) * 2;
      }
    }

    if (this.ally.active) {
      this.ally.x = this.ally.homeX + sway;
      this.ally.y =
        this.ally.homeY +
        Math.sin(this.totalElapsedMs / 440 + this.ally.id) * 2;
    }

    this.nextDiveMs -= deltaMs;
    if (this.nextDiveMs <= 0) {
      this.startEnemyDive();
      const stage = visibleStage(this.stageCursor);
      this.nextDiveMs = this.randomRange(
        Math.max(700, 2_100 - stage * 70),
        Math.max(1_100, 4_200 - stage * 120),
      );
    }
  }

  private startEnemyDive(): void {
    const candidates = this.enemies.filter(
      (enemy) => enemy.active && enemy.mode === "formation",
    );
    if (candidates.length === 0) return;

    const enemy = candidates[randomInt(this.random, 0, candidates.length - 1)];
    if (
      enemy.kind === "striker" &&
      visibleStage(this.stageCursor) >= 5 &&
      this.random.next() < 0.18
    ) {
      enemy.kind = "morph";
      this.emit("enemy-morph");
    }
    const useTractor =
      enemy.kind === "commander" &&
      !enemy.capturedFighter &&
      !this.enemies.some((candidate) => candidate.mode === "tractor") &&
      this.random.next() < 0.4;

    enemy.mode = useTractor ? "tractor" : "diving";
    enemy.diveProgress = 0;
    enemy.diveOriginX = enemy.x;
    enemy.hasFired = false;
    enemy.escortCount = 0;
    if (enemy.kind === "commander" && !useTractor) {
      const escorts = candidates
        .filter(
          (candidate) =>
            candidate.kind === "scout" &&
            candidate.id !== enemy.id &&
            Math.abs(candidate.homeX - enemy.homeX) <= 70,
        )
        .sort(
          (first, second) =>
            Math.abs(first.homeX - enemy.homeX) -
            Math.abs(second.homeX - enemy.homeX),
        )
        .slice(0, 2);
      enemy.escortCount = escorts.length;
      escorts.forEach((escort) => {
        escort.mode = "diving";
        escort.escortLeaderId = enemy.id;
        escort.diveProgress = 0;
        escort.hasFired = true;
      });
    }
    this.emit(useTractor ? "tractor-start" : "enemy-dive");
    if (useTractor) this.emit("tractor-loop-start");
  }

  private updateEnemies(deltaMs: number): void {
    const stageSpeed =
      1 + Math.min(1.2, visibleStage(this.stageCursor) * 0.035);

    for (const enemy of this.enemies) {
      if (
        !enemy.active ||
        (enemy.mode !== "diving" && enemy.mode !== "tractor")
      )
        continue;

      if (enemy.escortLeaderId !== null) {
        const leader = this.enemies.find(
          (candidate) => candidate.id === enemy.escortLeaderId,
        );
        if (!leader?.active || leader.mode === "formation") {
          enemy.escortLeaderId = null;
          enemy.mode = "formation";
          enemy.x = enemy.homeX;
          enemy.y = enemy.homeY;
          enemy.diveProgress = 0;
        } else {
          const escortIndex = this.enemies
            .filter((candidate) => candidate.escortLeaderId === leader.id)
            .findIndex((candidate) => candidate.id === enemy.id);
          enemy.diveProgress = leader.diveProgress;
          enemy.x = leader.x + (escortIndex === 0 ? -20 : 20);
          enemy.y = leader.y + 13;
        }
        continue;
      }

      const durationMs = enemy.mode === "tractor" ? 4_300 : 3_400;
      enemy.diveProgress += (deltaMs * stageSpeed) / durationMs;
      const progress = enemy.diveProgress;

      if (enemy.mode === "tractor") {
        this.updateTractorEnemy(enemy, progress);
      } else {
        enemy.x = enemy.diveOriginX + Math.sin(progress * Math.PI * 2) * 62;
        enemy.y =
          enemy.homeY +
          Math.sin(Math.min(progress, 1) * Math.PI) *
            (STAGE_HEIGHT - enemy.homeY + 24);
      }

      if (!enemy.hasFired && progress >= 0.38 && enemy.mode === "diving") {
        enemy.hasFired = true;
        this.spawnEnemyProjectile(enemy, enemy.kind === "morph");
      }

      if (progress >= 1) {
        if (enemy.mode === "tractor") this.emit("tractor-loop-stop");
        enemy.mode = "formation";
        enemy.x = enemy.homeX;
        enemy.y = enemy.homeY;
        enemy.diveProgress = 0;
        for (const escort of this.enemies) {
          if (escort.escortLeaderId === enemy.id) {
            escort.escortLeaderId = null;
            escort.mode = "formation";
            escort.x = escort.homeX;
            escort.y = escort.homeY;
            escort.diveProgress = 0;
          }
        }
      }
    }
  }

  private updateTractorEnemy(enemy: EnemyState, progress: number): void {
    if (progress < 0.28) {
      const local = progress / 0.28;
      enemy.x = enemy.diveOriginX + Math.sin(local * Math.PI) * 34;
      enemy.y = enemy.homeY + local * 90;
      return;
    }

    if (progress < 0.72) {
      enemy.y = enemy.homeY + 90;
      enemy.x = enemy.diveOriginX + Math.sin(progress * 18) * 3;
      if (
        this.player.visible &&
        this.player.invulnerableMs <= 0 &&
        Math.abs(this.player.x + this.player.width / 2 - enemy.x) <= 20
      ) {
        enemy.capturedFighter = true;
        this.emit("tractor-capture-complete");
        this.emit("player-captured");
        this.emit("tractor-loop-stop");
        this.killPlayer("capture");
        enemy.mode = "diving";
        enemy.diveProgress = 0.76;
      }
      return;
    }

    const local = (progress - 0.72) / 0.28;
    enemy.y = enemy.homeY + 90 - local * 90;
    enemy.x = enemy.diveOriginX;
  }

  private spawnEnemyProjectile(enemy: EnemyState, charged: boolean): void {
    this.projectiles.push({
      id: this.nextId(),
      owner: "enemy",
      x: enemy.x + enemy.width / 2 - (charged ? 3 : 1),
      y: enemy.y + enemy.height,
      width: charged ? 6 : 3,
      height: charged ? 10 : 7,
      vx: 0,
      vy: ENEMY_PROJECTILE_SPEED + visibleStage(this.stageCursor) * 3,
      active: true,
      charged,
    });
    this.emit(charged ? "special-charge" : "enemy-projectile");
  }

  private updateChallenge(_deltaMs: number): void {
    const runDurationMs = 2_900;
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;
      const local =
        (this.phaseElapsedMs - enemy.challengeDelayMs) / runDurationMs;
      if (local < 0) {
        enemy.x = enemy.homeX;
        enemy.y = -24;
      } else if (local <= 1) {
        enemy.x = enemy.homeX + Math.sin(local * Math.PI * 2) * 44;
        enemy.y = -24 + local * (STAGE_HEIGHT + 48);
      } else {
        enemy.active = false;
      }
    }

    if (this.ally.active) {
      const local =
        (this.phaseElapsedMs - this.ally.challengeDelayMs) / runDurationMs;
      if (local < 0) {
        this.ally.y = -24;
      } else if (local <= 1) {
        this.ally.x = this.ally.homeX + Math.sin(local * Math.PI * 2) * 44;
        this.ally.y = -24 + local * (STAGE_HEIGHT + 48);
      } else {
        this.ally.active = false;
        this.ally.escaped = true;
      }
    }
  }

  private updateProjectiles(deltaMs: number): void {
    for (const projectile of this.projectiles) {
      if (!projectile.active) continue;
      projectile.x += (projectile.vx * deltaMs) / 1_000;
      projectile.y += (projectile.vy * deltaMs) / 1_000;
      if (projectile.y < -20 || projectile.y > STAGE_HEIGHT + 20) {
        projectile.active = false;
      }
    }
  }

  private resolveCollisions(): void {
    for (const projectile of this.projectiles) {
      if (!projectile.active) continue;
      if (projectile.owner === "player") {
        if (this.hitAlphabetAlly(projectile)) return;
        this.hitEnemy(projectile);
      } else if (
        this.player.visible &&
        this.player.invulnerableMs <= 0 &&
        this.overlaps(projectile, this.player)
      ) {
        projectile.active = false;
        this.killPlayer("projectile");
        return;
      }
    }

    if (!this.player.visible || this.player.invulnerableMs > 0) return;
    for (const enemy of this.enemies) {
      if (
        enemy.active &&
        enemy.mode !== "formation" &&
        this.overlaps(enemy, this.player)
      ) {
        enemy.active = false;
        this.killPlayer("enemy");
        return;
      }
    }
  }

  private hitAlphabetAlly(projectile: ProjectileState): boolean {
    if (!this.ally.active || !this.overlaps(projectile, this.ally))
      return false;
    projectile.active = false;
    this.ally.active = false;
    this.ally.escaped = true;
    this.emit("ally-hit-warning");
    this.killPlayer("alphabet");
    return true;
  }

  private hitEnemy(projectile: ProjectileState): void {
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;

      if (enemy.capturedFighter) {
        const capturedFighterRect = {
          x: enemy.x + enemy.width / 2 - 6,
          y: enemy.y + enemy.height + 3,
          width: 12,
          height: 8,
        };
        if (this.overlaps(projectile, capturedFighterRect)) {
          projectile.active = false;
          enemy.capturedFighter = false;
          this.awardPoints(1_000);
          this.emit("captured-fighter-destroyed");
          return;
        }
      }

      if (!this.overlaps(projectile, enemy)) continue;
      projectile.active = false;
      enemy.hp -= 1;

      if (enemy.hp > 0) {
        this.emit("strong-enemy-hit");
        return;
      }

      enemy.active = false;
      if (this.isChallenge()) this.challengeHits += 1;
      this.awardPoints(
        scoreForEnemy(enemy.kind, enemy.mode, enemy.escortCount),
      );

      if (enemy.capturedFighter) {
        enemy.capturedFighter = false;
        this.player.dual = true;
        this.player.width = 34;
        this.emit("fighter-rescued");
      }

      if (enemy.kind === "scout") this.emit("basic-enemy-destroyed");
      else if (enemy.kind === "commander") this.emit("strong-enemy-destroyed");
      else this.emit("special-enemy-destroyed");
      return;
    }
  }

  private killPlayer(cause: DeathCause): void {
    if (
      !this.player.visible ||
      this.phase === "player-death" ||
      this.phase === "game-over"
    )
      return;

    const damage = resolveShipDamage(this.hearts, this.player.dual, cause);
    if (!damage.fullDeath) {
      this.player.dual = damage.dual;
      this.player.width = 20;
      this.player.invulnerableMs = RESPAWN_INVULNERABILITY_MS;
      this.emit("ship-explosion");
      return;
    }

    this.player.dual = damage.dual;
    this.player.width = 20;
    this.player.visible = false;
    this.hearts = damage.hearts;
    this.phase = "player-death";
    this.phaseElapsedMs = 0;
    this.projectiles = this.projectiles.filter(
      (projectile) => projectile.owner === "player",
    );
    this.emit("ship-explosion");
  }

  private updateDeath(): void {
    if (this.phaseElapsedMs < DEATH_DURATION_MS) return;
    if (this.hearts <= 0) {
      this.phase = "game-over";
      this.phaseElapsedMs = 0;
      this.emit("tractor-loop-stop");
      return;
    }

    this.phase = "active";
    this.phaseElapsedMs = 0;
    this.player.visible = true;
    this.player.x = STAGE_WIDTH / 2 - this.player.width / 2;
    this.player.invulnerableMs = RESPAWN_INVULNERABILITY_MS;
  }

  private checkWaveComplete(): void {
    if (this.phase !== "active" || this.enemies.some((enemy) => enemy.active))
      return;

    if (this.isChallenge()) {
      this.awardPoints(challengeBonus(this.challengeHits));
    }
    this.ally.active = false;
    this.ally.escaped = true;
    this.phase = "wave-clear";
    this.phaseElapsedMs = 0;
    this.emit("tractor-loop-stop");
  }

  private awardPoints(points: number): void {
    const result = addScore(
      {
        score: this.score,
        highScore: this.highScore,
        hearts: this.hearts,
        nextExtraHeartAt: this.nextExtraHeartAt,
      },
      points,
    );
    this.score = result.score;
    this.highScore = result.highScore;
    this.hearts = result.hearts;
    this.nextExtraHeartAt = result.nextExtraHeartAt;
    for (let index = 0; index < result.extraHeartsAwarded; index += 1) {
      this.emit("extra-life");
    }
  }

  private updateLowHeartWarning(deltaMs: number): void {
    if (this.hearts !== 1 || !this.player.visible) {
      this.lowHeartPulseMs = 0;
      return;
    }
    this.lowHeartPulseMs += deltaMs;
    if (this.lowHeartPulseMs >= LOW_HEART_PULSE_MS) {
      this.lowHeartPulseMs %= LOW_HEART_PULSE_MS;
      this.emit("low-heart-warning");
    }
  }

  private removeInactiveProjectiles(): void {
    this.projectiles = this.projectiles.filter(
      (projectile) => projectile.active,
    );
  }

  private isChallenge(): boolean {
    return isChallengeStage(this.stageCursor.pattern);
  }

  private emit(cue: AudioCue): void {
    this.audioCues.push(cue);
  }

  private randomRange(minimum: number, maximum: number): number {
    return minimum + this.random.next() * (maximum - minimum);
  }

  private nextId(): number {
    const id = this.nextEntityId;
    this.nextEntityId += 1;
    return id;
  }

  private createPlayer(): PlayerState {
    return {
      x: STAGE_WIDTH / 2 - 10,
      y: PLAYER_Y,
      width: 20,
      height: 13,
      visible: true,
      dual: false,
      invulnerableMs: RESPAWN_INVULNERABILITY_MS,
    };
  }

  private createPlaceholderAlly(): AlphabetAllyState {
    return {
      id: 0,
      letter: "A",
      x: STAGE_WIDTH / 2,
      y: 120,
      width: 16,
      height: 16,
      homeX: STAGE_WIDTH / 2,
      homeY: 120,
      active: false,
      escaped: false,
      challengeDelayMs: 0,
    };
  }

  private overlaps(first: Rectangle, second: Rectangle): boolean {
    return (
      first.x < second.x + second.width &&
      first.x + first.width > second.x &&
      first.y < second.y + second.height &&
      first.y + first.height > second.y
    );
  }
}
