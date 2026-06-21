import Enemy from "@/game/enemies/Enemy";
import type { EnemyAIConfig } from "@/game/enemies/ai/enemyStateMachine";
import EnemyStateMachine from "@/game/enemies/ai/enemyStateMachine";
import type Level1 from "@/game/scenes/Level1";

const BASIC_NINJA_CONFIG: EnemyAIConfig = {
  stateAnimations: {
    idle: "basic_ninja_idle",
    patrol: "basic_ninja_walk",
    alert: "basic_ninja_idle",
    chase: "basic_ninja_walk",
    attack: "basic_ninja_attack",
    stunned: "basic_ninja_hurt",
    recover: "basic_ninja_idle",
    dead: "basic_ninja_hurt",
  },
  idleDurationMs: 180,
  patrolRadius: 86,
  patrolSpeed: 58,
  alertDurationMs: 120,
  detectionRange: 340,
  alertRange: 420,
  loseInterestRange: 420,
  verticalAwarenessRange: 110,
  attackRange: 66,
  attackVerticalRange: 54,
  attackCooldownMs: 650,
  attackDurationMs: 320,
  attackActiveStartMs: 120,
  attackActiveEndMs: 220,
  parryWindowStartMs: 86,
  parryWindowEndMs: 168,
  attackDamage: 1,
  attackKnockbackX: 150,
  attackKnockbackY: -120,
  attackHitboxWidth: 76,
  attackHitboxHeight: 54,
  attackHitboxOffsetX: 38,
  attackHitboxOffsetY: -10,
  recoverMs: 180,
  stunRecoverMs: 120,
  jumpGapProbeWidth: 14,
  jumpGapProbeHeight: 12,
  jumpGapVelocity: -450,
  ladderDetectionRange: 38,
  ladderClimbSpeed: 180,
  chaseSpeed: 108,
};

export default class BasicNinja extends Enemy {
  private readonly brain: EnemyStateMachine;

  constructor(scene: Level1, x: number, y: number) {
    super(scene, {
      x,
      y,
      texture: "basic_ninja_sheet",
      bodyWidth: 24,
      bodyHeight: 48,
      animationKey: "basic_ninja_idle",
      maxHealth: 3,
    });

    this.brain = new EnemyStateMachine(this, BASIC_NINJA_CONFIG);
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
