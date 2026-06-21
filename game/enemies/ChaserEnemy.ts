import Enemy from "@/game/enemies/Enemy";
import type { EnemyAIConfig } from "@/game/enemies/ai/enemyStateMachine";
import EnemyStateMachine from "@/game/enemies/ai/enemyStateMachine";
import type Level1 from "@/game/scenes/Level1";

const CHASER_CONFIG: EnemyAIConfig = {
  stateAnimations: {
    idle: "enemy_idle",
    patrol: "enemy_walk",
    alert: "enemy_idle",
    chase: "enemy_walk",
    attack: "enemy_walk",
    stunned: "enemy_idle",
    recover: "enemy_idle",
    dead: "enemy_idle",
  },
  idleDurationMs: 120,
  patrolRadius: 96,
  patrolSpeed: 62,
  alertDurationMs: 110,
  detectionRange: 400,
  alertRange: 460,
  loseInterestRange: 460,
  verticalAwarenessRange: 130,
  attackRange: 72,
  attackVerticalRange: 58,
  attackCooldownMs: 720,
  attackDurationMs: 340,
  attackActiveStartMs: 128,
  attackActiveEndMs: 230,
  parryWindowStartMs: 96,
  parryWindowEndMs: 176,
  attackDamage: 1,
  attackKnockbackX: 180,
  attackKnockbackY: -130,
  attackHitboxWidth: 82,
  attackHitboxHeight: 54,
  attackHitboxOffsetX: 40,
  attackHitboxOffsetY: -8,
  recoverMs: 200,
  stunRecoverMs: 140,
  jumpGapProbeWidth: 16,
  jumpGapProbeHeight: 12,
  jumpGapVelocity: -460,
  ladderDetectionRange: 44,
  ladderClimbSpeed: 190,
  chaseSpeed: 132,
};

export default class ChaserEnemy extends Enemy {
  private readonly brain: EnemyStateMachine;

  constructor(scene: Level1, x: number, y: number) {
    super(scene, {
      x,
      y,
      texture: "enemy_sheet",
      bodyWidth: 24,
      bodyHeight: 48,
      animationKey: "enemy_idle",
      maxHealth: 4,
    });

    this.brain = new EnemyStateMachine(this, CHASER_CONFIG);
  }

  update() {
    this.brain.update();
  }

  override canBeParried(now: number) {
    return this.brain.canBeParried(now);
  }

  protected override onDamaged(knockbackDirection: number) {
    this.brain.onDamaged(knockbackDirection);
  }

  protected override onDeathStarted() {
    this.brain.onDeathStarted();
  }

  protected override onParried(stunDurationMs: number) {
    this.brain.onParried(stunDurationMs);
  }
}
