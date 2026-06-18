import Phaser from "phaser";

import Enemy from "@/game/enemies/Enemy";
import type Level1 from "@/game/scenes/Level1";

type NinjaState = "patrol" | "chase" | "attack" | "hurt" | "stunned";

const PATROL_SPEED = 58;
const CHASE_SPEED = 108;
const PATROL_RADIUS = 86;
const DETECTION_RANGE = 340;
const LOSE_INTEREST_RANGE = 420;
const VERTICAL_AWARENESS_RANGE = 110;
const ATTACK_TRIGGER_RANGE = 66;
const ATTACK_VERTICAL_RANGE = 54;
const ATTACK_REACH = 76;
const ATTACK_HEIGHT = 54;
const ATTACK_COOLDOWN_MS = 650;
const ATTACK_DURATION_MS = 320;
const ATTACK_ACTIVE_START_MS = 120;
const ATTACK_ACTIVE_END_MS = 220;
const PARRY_WINDOW_START_MS = ATTACK_ACTIVE_START_MS - 34;
const PARRY_WINDOW_END_MS = ATTACK_ACTIVE_START_MS + 48;
const HURT_STUN_MS = 180;
const MAX_HEALTH = 3;
const PARRY_RANGE = 88;
const PARRY_VERTICAL_RANGE = 58;

export default class BasicNinja extends Enemy {
  private readonly homeX: number;

  private state: NinjaState = "patrol";
  private patrolDirection = 1;
  private attackStartedAt = -Infinity;
  private attackCooldownUntil = 0;
  private hurtUntil = 0;
  private hitPlayerThisAttack = false;

  constructor(scene: Level1, x: number, y: number) {
    super(scene, {
      x,
      y,
      texture: "basic_ninja_sheet",
      bodyWidth: 24,
      bodyHeight: 48,
      animationKey: "basic_ninja_idle",
      maxHealth: MAX_HEALTH,
    });

    this.homeX = x;
  }

  update() {
    if (this.isDead()) {
      return;
    }

    const now = this.scene.time.now;

    if (this.state === "hurt") {
      this.updateHurt(now);
      return;
    }

    if (this.state === "stunned") {
      this.updateStunned(now);
      return;
    }

    if (this.state === "attack") {
      this.updateAttack(now);
      return;
    }

    if (this.canDetectPlayer()) {
      this.updateCombatBehavior(now);
      return;
    }

    this.updatePatrol();
  }

  handlePlayerContact() {
    if (this.state === "attack" && !this.isStunned()) {
      this.tryDamagePlayerDuringAttack();
    }
  }

  override canBeParried(now: number) {
    return (
      this.state === "attack" &&
      !this.isStunned() &&
      this.horizontalDistanceToPlayer() <= PARRY_RANGE &&
      this.verticalDistanceToPlayer() <= PARRY_VERTICAL_RANGE &&
      now >= this.attackStartedAt + PARRY_WINDOW_START_MS &&
      now <= this.attackStartedAt + PARRY_WINDOW_END_MS
    );
  }

  protected override onDamaged(knockbackDirection: number) {
    if (this.getHealth() <= 0) {
      return;
    }

    this.state = "hurt";
    this.hurtUntil = this.scene.time.now + HURT_STUN_MS;
    this.attackStartedAt = -Infinity;
    this.hitPlayerThisAttack = false;
    this.attackCooldownUntil = this.scene.time.now + 120;
    this.stopHorizontalMovement();
    this.faceDirection(-knockbackDirection);
    this.playAnimation("basic_ninja_hurt");
  }

  protected override onDeathStarted() {
    this.stopHorizontalMovement();
  }

  protected override onParried(stunDurationMs: number) {
    this.state = "stunned";
    this.attackStartedAt = -Infinity;
    this.hitPlayerThisAttack = false;
    this.attackCooldownUntil = this.scene.time.now + stunDurationMs + 140;
    this.stopHorizontalMovement();
    this.facePlayer();
    this.sprite.setTint(0x67e8f9);
    this.playAnimation("basic_ninja_hurt");
  }

  private updatePatrol() {
    const leftEdge = this.homeX - PATROL_RADIUS;
    const rightEdge = this.homeX + PATROL_RADIUS;

    if (this.sprite.x <= leftEdge) {
      this.patrolDirection = 1;
    } else if (this.sprite.x >= rightEdge) {
      this.patrolDirection = -1;
    }

    this.state = "patrol";
    this.sprite.setVelocityX(this.patrolDirection * PATROL_SPEED);
    this.faceDirection(this.patrolDirection);
    this.playAnimation("basic_ninja_walk");
  }

  private updateCombatBehavior(now: number) {
    if (this.isPlayerWithinAttackTriggerRange()) {
      this.stopHorizontalMovement();
      this.facePlayer();

      if (now >= this.attackCooldownUntil) {
        this.startAttack(now);
      } else {
        this.playAnimation("basic_ninja_idle");
      }
      return;
    }

    this.state = "chase";
    this.moveTowardPlayer(CHASE_SPEED);
    this.playAnimation("basic_ninja_walk");
  }

  private startAttack(now: number) {
    this.state = "attack";
    this.attackStartedAt = now;
    this.attackCooldownUntil = now + ATTACK_COOLDOWN_MS;
    this.hitPlayerThisAttack = false;
    this.stopHorizontalMovement();
    this.facePlayer();
    this.playAnimation("basic_ninja_attack");
  }

  private updateAttack(now: number) {
    if (this.isStunned()) {
      this.updateStunned(now);
      return;
    }

    this.stopHorizontalMovement();
    this.facePlayer();
    this.tryDamagePlayerDuringAttack();

    if (now >= this.attackStartedAt + ATTACK_DURATION_MS) {
      this.state = "chase";
      if (this.canDetectPlayer()) {
        this.playAnimation("basic_ninja_idle");
      } else {
        this.playAnimation("basic_ninja_walk");
      }
    }
  }

  private updateHurt(now: number) {
    this.stopHorizontalMovement();

    if (now < this.hurtUntil) {
      return;
    }

    this.state = this.canDetectPlayer() ? "chase" : "patrol";
    this.playAnimation(this.state === "patrol" ? "basic_ninja_walk" : "basic_ninja_idle");
  }

  private updateStunned(now: number) {
    this.stopHorizontalMovement();
    this.playAnimation("basic_ninja_hurt");

    if (now < this.getStunnedUntil()) {
      return;
    }

    if (this.sprite.active) {
      this.sprite.clearTint();
    }
    this.state = this.canDetectPlayer() ? "chase" : "patrol";
    this.playAnimation(this.state === "patrol" ? "basic_ninja_walk" : "basic_ninja_idle");
  }

  private canDetectPlayer() {
    return (
      this.distanceToPlayer() <= DETECTION_RANGE &&
      this.verticalDistanceToPlayer() <= VERTICAL_AWARENESS_RANGE
    ) || (
      this.state !== "patrol" &&
      this.distanceToPlayer() <= LOSE_INTEREST_RANGE &&
      this.verticalDistanceToPlayer() <= VERTICAL_AWARENESS_RANGE
    );
  }

  private isPlayerWithinAttackTriggerRange() {
    return (
      this.horizontalDistanceToPlayer() <= ATTACK_TRIGGER_RANGE &&
      this.verticalDistanceToPlayer() <= ATTACK_VERTICAL_RANGE
    );
  }

  private tryDamagePlayerDuringAttack() {
    if (this.hitPlayerThisAttack) {
      return;
    }

    const now = this.scene.time.now;
    if (
      now < this.attackStartedAt + ATTACK_ACTIVE_START_MS ||
      now > this.attackStartedAt + ATTACK_ACTIVE_END_MS
    ) {
      return;
    }

    const hitbox = this.createAttackHitbox();
    const playerBounds = this.getPlayerBounds();

    if (!Phaser.Geom.Intersects.RectangleToRectangle(hitbox, playerBounds)) {
      return;
    }

    this.hitPlayerThisAttack = this.damagePlayer();
  }

  private createAttackHitbox() {
    const direction = this.getFacingDirection();
    const centerX = this.sprite.x + direction * (ATTACK_REACH * 0.5);
    const centerY = this.sprite.y - 10;

    return new Phaser.Geom.Rectangle(
      centerX - ATTACK_REACH / 2,
      centerY - ATTACK_HEIGHT / 2,
      ATTACK_REACH,
      ATTACK_HEIGHT,
    );
  }
}
