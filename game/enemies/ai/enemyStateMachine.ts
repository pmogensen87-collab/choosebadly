import Phaser from "phaser";

import type Enemy from "@/game/enemies/Enemy";
import type { EnemyState } from "@/game/enemies/ai/enemyState";

export type EnemyAIConfig = {
  stateAnimations: Partial<Record<EnemyState, string>>;
  idleDurationMs: number;
  patrolRadius: number;
  patrolSpeed: number;
  alertDurationMs: number;
  detectionRange: number;
  alertRange: number;
  loseInterestRange: number;
  verticalAwarenessRange: number;
  attackRange: number;
  attackVerticalRange: number;
  attackCooldownMs: number;
  attackDurationMs: number;
  attackActiveStartMs: number;
  attackActiveEndMs: number;
  parryWindowStartMs: number;
  parryWindowEndMs: number;
  attackDamage: number;
  attackKnockbackX: number;
  attackKnockbackY: number;
  attackHitboxWidth: number;
  attackHitboxHeight: number;
  attackHitboxOffsetX: number;
  attackHitboxOffsetY: number;
  recoverMs: number;
  stunRecoverMs: number;
  jumpGapProbeWidth: number;
  jumpGapProbeHeight: number;
  jumpGapVelocity: number;
  ladderDetectionRange: number;
  ladderClimbSpeed: number;
  chaseSpeed: number;
};

const DEFAULT_STATE_ANIMATIONS: Partial<Record<EnemyState, string>> = {
  idle: "basic_ninja_idle",
  patrol: "basic_ninja_walk",
  alert: "basic_ninja_idle",
  chase: "basic_ninja_walk",
  attack: "basic_ninja_attack",
  stunned: "basic_ninja_hurt",
  recover: "basic_ninja_idle",
  dead: "basic_ninja_hurt",
};

export default class EnemyStateMachine {
  private readonly enemy: Enemy;
  private readonly config: EnemyAIConfig;
  private state: EnemyState = "idle";
  private stateStartedAt = 0;
  private stateEndsAt = 0;
  private attackAvailableAt = 0;
  private attackHitPlayer = false;
  private patrolDirection = 1;
  private readonly homeX: number;

  constructor(enemy: Enemy, config: EnemyAIConfig) {
    this.enemy = enemy;
    this.config = {
      ...config,
      stateAnimations: {
        ...DEFAULT_STATE_ANIMATIONS,
        ...config.stateAnimations,
      },
    };
    this.homeX = this.enemy.sprite.x;
    this.setState("idle");
  }

  update() {
    const now = this.enemy.scene.time.now;

    if (this.state === "dead") {
      this.enemy.stopHorizontalMovement();
      return;
    }

    switch (this.state) {
      case "idle":
        this.updateIdle(now);
        break;
      case "patrol":
        this.updatePatrol(now);
        break;
      case "alert":
        this.updateAlert(now);
        break;
      case "chase":
        this.updateChase(now);
        break;
      case "attack":
        this.updateAttack(now);
        break;
      case "stunned":
        this.updateStunned(now);
        break;
      case "recover":
        this.updateRecover(now);
        break;
    }
  }

  onDamaged(knockbackDirection: number) {
    if (this.state === "dead") {
      return;
    }

    this.enemy.faceDirection(-knockbackDirection);
    this.attackHitPlayer = false;
    this.transition("recover", this.enemy.scene.time.now + this.config.recoverMs);
  }

  onParried(stunDurationMs: number) {
    if (this.state === "dead") {
      return;
    }

    this.attackHitPlayer = false;
    this.enemy.sprite.clearTint();
    this.transition("stunned", this.enemy.scene.time.now + stunDurationMs);
  }

  onDeathStarted() {
    this.attackHitPlayer = false;
    this.transition("dead");
  }

  canBeParried(now: number) {
    if (this.state !== "attack") {
      return false;
    }

    return (
      now >= this.stateStartedAt + this.config.parryWindowStartMs &&
      now <= this.stateStartedAt + this.config.parryWindowEndMs &&
      this.enemy.horizontalDistanceToPlayer() <= this.config.attackRange +
        this.config.attackHitboxWidth * 0.25 &&
      this.enemy.verticalDistanceToPlayer() <= this.config.attackVerticalRange
    );
  }

  private updateIdle(now: number) {
    this.enemy.stopHorizontalMovement();
    this.enemy.setAllowGravity(true);
    this.enemy.playAnimation(this.resolveAnimation("idle"));

    if (this.canSeePlayer()) {
      this.transition("alert", now + this.config.alertDurationMs);
      return;
    }

    if (now >= this.stateEndsAt) {
      this.transition("patrol");
    }
  }

  private updatePatrol(now: number) {
    const playerVisible = this.canSeePlayer();
    this.enemy.setAllowGravity(true);
    this.enemy.playAnimation(this.resolveAnimation("patrol"));

    if (playerVisible) {
      this.transition("alert", now + this.config.alertDurationMs);
      return;
    }

    const leftEdge = this.homeX - this.config.patrolRadius;
    const rightEdge = this.homeX + this.config.patrolRadius;
    if (this.enemy.sprite.x <= leftEdge) {
      this.patrolDirection = 1;
    } else if (this.enemy.sprite.x >= rightEdge) {
      this.patrolDirection = -1;
    }

    this.enemy.setVelocityX(this.patrolDirection * this.config.patrolSpeed);
    this.enemy.faceDirection(this.patrolDirection);

    if (!this.isGroundAhead(this.patrolDirection)) {
      this.patrolDirection *= -1;
      this.enemy.faceDirection(this.patrolDirection);
      this.enemy.setVelocityX(this.patrolDirection * this.config.patrolSpeed);
    }
  }

  private updateAlert(now: number) {
    this.enemy.stopHorizontalMovement();
    this.enemy.setAllowGravity(true);
    this.enemy.facePlayer();
    this.enemy.playAnimation(this.resolveAnimation("alert"));

    if (!this.canSeePlayer()) {
      this.transition("recover", now + this.config.recoverMs);
      return;
    }

    if (now >= this.stateEndsAt) {
      this.transition("chase");
    }
  }

  private updateChase(now: number) {
    this.enemy.setAllowGravity(true);

    if (!this.canSeePlayer()) {
      this.transition("recover", now + this.config.recoverMs);
      return;
    }

    const horizontalDistance = this.enemy.horizontalDistanceToPlayer();
    const verticalDistance = this.enemy.verticalDistanceToPlayer();

    if (
      horizontalDistance <= this.config.attackRange &&
      verticalDistance <= this.config.attackVerticalRange
    ) {
      if (now >= this.attackAvailableAt) {
        this.transition("attack", now + this.config.attackDurationMs);
        this.attackAvailableAt = now + this.config.attackCooldownMs;
      } else {
        this.enemy.stopHorizontalMovement();
        this.enemy.playAnimation(this.resolveAnimation("chase"));
      }
      return;
    }

    const ladder = this.findLadder();
    if (
      ladder &&
      verticalDistance > 54 &&
      horizontalDistance <= this.config.ladderDetectionRange
    ) {
      this.climbTowardPlayer(ladder);
      return;
    }

    const direction = this.enemy.moveTowardPlayer(this.config.chaseSpeed);

    if (this.shouldJumpSmallGap(direction)) {
      this.enemy.setVelocityY(this.config.jumpGapVelocity);
    }

    this.enemy.playAnimation(this.resolveAnimation("chase"));
  }

  private updateAttack(now: number) {
    this.enemy.stopHorizontalMovement();
    this.enemy.setAllowGravity(true);
    this.enemy.facePlayer();
    this.enemy.playAnimation(this.resolveAnimation("attack"));

    const activeStartsAt = this.stateStartedAt + this.config.attackActiveStartMs;
    const activeEndsAt = this.stateStartedAt + this.config.attackActiveEndMs;

    if (!this.attackHitPlayer && now >= activeStartsAt && now <= activeEndsAt) {
      this.tryDamagePlayerDuringAttack();
    }

    if (now >= this.stateEndsAt) {
      this.transition("recover", now + this.config.recoverMs);
    }
  }

  private updateStunned(now: number) {
    this.enemy.stopHorizontalMovement();
    this.enemy.setAllowGravity(true);
    this.enemy.playAnimation(this.resolveAnimation("stunned"));

    if (now >= this.stateEndsAt) {
      this.enemy.sprite.clearTint();
      this.transition("recover", now + this.config.stunRecoverMs);
    }
  }

  private updateRecover(now: number) {
    this.enemy.stopHorizontalMovement();
    this.enemy.setAllowGravity(true);
    this.enemy.playAnimation(this.resolveAnimation("recover"));

    if (now >= this.stateEndsAt) {
      if (this.canSeePlayer()) {
        this.transition("alert", now + this.config.alertDurationMs);
      } else {
        this.transition("patrol");
      }
    }
  }

  private tryDamagePlayerDuringAttack() {
    const direction = this.enemy.getFacingDirection();
    const hitbox = new Phaser.Geom.Rectangle(
      this.enemy.sprite.x + this.config.attackHitboxOffsetX * direction -
        this.config.attackHitboxWidth / 2,
      this.enemy.sprite.y + this.config.attackHitboxOffsetY -
        this.config.attackHitboxHeight / 2,
      this.config.attackHitboxWidth,
      this.config.attackHitboxHeight,
    );

    if (!Phaser.Geom.Intersects.RectangleToRectangle(
      hitbox,
      this.enemy.getPlayerBounds(),
    )) {
      return;
    }

    this.attackHitPlayer = this.enemy.damagePlayer(this.config.attackDamage);
  }

  private canSeePlayer() {
    const distance = this.enemy.distanceToPlayer();
    const verticalDistance = this.enemy.verticalDistanceToPlayer();

    if (this.state === "patrol") {
      return (
        distance <= this.config.detectionRange &&
        verticalDistance <= this.config.verticalAwarenessRange
      );
    }

    return (
      distance <= Math.max(this.config.alertRange, this.config.loseInterestRange) &&
      verticalDistance <= this.config.verticalAwarenessRange
    );
  }

  private findLadder() {
    const playerX = this.enemy.sprite.x;
    const playerY = this.enemy.sprite.y;

    return this.enemy.scene.ladders.getChildren().find((child) => {
      const sensor = child as Phaser.GameObjects.Sprite;
      const body = sensor.body as Phaser.Physics.Arcade.StaticBody;
      if (!body) {
        return false;
      }

      const distanceX = Math.abs(body.center.x - playerX);
      const distanceY = Math.abs(body.center.y - playerY);
      return distanceX <= this.config.ladderDetectionRange && distanceY <= 220;
    }) as Phaser.GameObjects.Sprite | undefined;
  }

  private climbTowardPlayer(ladder: Phaser.GameObjects.Sprite) {
    const ladderBody = ladder.body as Phaser.Physics.Arcade.StaticBody;
    const playerAbove = this.enemy.scene.player.y < this.enemy.sprite.y;
    const targetVelocity = playerAbove ? -this.config.ladderClimbSpeed : this.config.ladderClimbSpeed;

    this.enemy.setAllowGravity(false);
    this.enemy.setVelocityX(0);
    this.enemy.faceDirection(this.enemy.scene.player.x < ladderBody.center.x ? -1 : 1);
    this.enemy.setVelocityY(targetVelocity);
    this.enemy.playAnimation(this.resolveAnimation("chase"));
  }

  private shouldJumpSmallGap(direction: number) {
    if (!this.enemy.isGrounded()) {
      return false;
    }

    const body = this.enemy.getBody();
    const probeX = direction > 0
      ? body.right + 6
      : body.left - this.config.jumpGapProbeWidth - 6;
    const probeY = body.bottom + 2;
    const bodies = this.enemy.scene.physics.overlapRect(
      probeX,
      probeY,
      this.config.jumpGapProbeWidth,
      this.config.jumpGapProbeHeight,
      false,
      true,
    );

    return bodies.length === 0;
  }

  private isGroundAhead(direction: number) {
    const body = this.enemy.getBody();
    const probeX = direction > 0
      ? body.right + 4
      : body.left - this.config.jumpGapProbeWidth - 4;
    const probeY = body.bottom + 2;
    const bodies = this.enemy.scene.physics.overlapRect(
      probeX,
      probeY,
      this.config.jumpGapProbeWidth,
      this.config.jumpGapProbeHeight,
      false,
      true,
    );

    return bodies.length > 0;
  }

  private resolveAnimation(state: EnemyState) {
    return this.config.stateAnimations[state] ?? this.config.stateAnimations.idle ?? "basic_ninja_idle";
  }

  private setState(next: EnemyState, endsAt = 0) {
    this.state = next;
    this.stateStartedAt = this.enemy.scene.time.now;
    this.stateEndsAt = endsAt;
    this.attackHitPlayer = false;

    if (next === "dead") {
      this.enemy.stopHorizontalMovement();
      this.enemy.setAllowGravity(true);
    }

    if (next === "idle") {
      this.stateEndsAt = this.enemy.scene.time.now + this.config.idleDurationMs;
    }
  }

  private transition(next: EnemyState, endsAt = 0) {
    if (this.state === next) {
      this.stateEndsAt = endsAt;
      return;
    }

    this.setState(next, endsAt);
  }
}
