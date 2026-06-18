import Phaser from "phaser";

import type Level1 from "@/game/scenes/Level1";

type EnemyConfig = {
  x: number;
  y: number;
  texture: string;
  frame?: number | string;
  bodyWidth?: number;
  bodyHeight?: number;
  animationKey?: string;
  maxHealth?: number;
};

export default abstract class Enemy {
  readonly scene: Level1;
  readonly sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;

  private readonly maxHealth: number;
  private health: number;
  private stunnedUntil = 0;

  protected constructor(scene: Level1, config: EnemyConfig) {
    this.scene = scene;
    this.sprite = scene.enemies.create(
      config.x,
      config.y,
      config.texture,
      config.frame,
    ) as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;

    this.maxHealth = config.maxHealth ?? 1;
    this.health = this.maxHealth;

    this.sprite.setDataEnabled();
    this.sprite.setData("dead", false);
    this.sprite.setData("enemyController", this);

    if (config.bodyWidth !== undefined && config.bodyHeight !== undefined) {
      this.sprite.setSize(config.bodyWidth, config.bodyHeight);
    }

    if (config.animationKey) {
      this.playAnimation(config.animationKey);
    }

    this.sprite.setCollideWorldBounds(true);
  }

  abstract update(): void;

  isDead() {
    return !this.sprite.active || this.sprite.getData("dead") === true;
  }

  getHealth() {
    return this.health;
  }

  getMaxHealth() {
    return this.maxHealth;
  }

  handlePlayerContact() {}

  isStunned() {
    return !this.isDead() && this.scene.time.now < this.stunnedUntil;
  }

  canBeParried(now: number) {
    void now;
    return false;
  }

  parry(stunDurationMs: number) {
    if (this.isDead()) {
      return false;
    }

    this.stunnedUntil = Math.max(this.stunnedUntil, this.scene.time.now + stunDurationMs);
    this.stopHorizontalMovement();
    this.onParried(stunDurationMs);
    return true;
  }

  takeDamage(amount: number, knockbackDirection: number) {
    if (this.isDead()) {
      return false;
    }

    this.health = Math.max(0, this.health - amount);
    this.scene.playSFX("punch");
    this.sprite.setTint(0xffffff);
    this.sprite.setVelocity(knockbackDirection * 150, -120);
    this.onDamaged(knockbackDirection);

    this.scene.time.delayedCall(90, () => {
      if (this.sprite.active && !this.isDead()) {
        this.sprite.clearTint();
      }
    });

    if (this.health <= 0) {
      this.die(knockbackDirection);
    }

    return true;
  }

  kill(knockbackDirection: number) {
    if (this.isDead()) {
      return;
    }

    this.health = 0;
    this.die(knockbackDirection);
  }

  destroy() {
    if (this.sprite.active) {
      this.sprite.destroy();
    }
  }

  protected onDamaged(knockbackDirection: number) {
    void knockbackDirection;
  }

  protected onDeathStarted() {}

  protected onParried(stunDurationMs: number) {
    void stunDurationMs;
  }

  protected getStunnedUntil() {
    return this.stunnedUntil;
  }

  protected distanceToPlayer() {
    return Phaser.Math.Distance.Between(
      this.scene.player.x,
      this.scene.player.y,
      this.sprite.x,
      this.sprite.y,
    );
  }

  protected horizontalDistanceToPlayer() {
    return Math.abs(this.scene.player.x - this.sprite.x);
  }

  protected verticalDistanceToPlayer() {
    return Math.abs(this.scene.player.y - this.sprite.y);
  }

  protected moveTowardPlayer(speed: number) {
    const direction = this.scene.player.x < this.sprite.x ? -1 : 1;
    this.sprite.setVelocityX(direction * speed);
    this.faceDirection(direction);
    return direction;
  }

  protected stopHorizontalMovement() {
    this.sprite.setVelocityX(0);
  }

  protected shouldJumpTowardPlayer(
    verticalThreshold: number,
    horizontalRange: number,
  ) {
    return (
      this.sprite.body.blocked.down &&
      (
        this.sprite.body.blocked.left ||
        this.sprite.body.blocked.right ||
        (
          this.scene.player.y < this.sprite.y - verticalThreshold &&
          Math.abs(this.scene.player.x - this.sprite.x) < horizontalRange
        )
      )
    );
  }

  protected faceDirection(direction: number) {
    this.sprite.setFlipX(direction < 0);
  }

  protected getFacingDirection() {
    return this.sprite.flipX ? -1 : 1;
  }

  protected facePlayer() {
    this.faceDirection(this.scene.player.x < this.sprite.x ? -1 : 1);
  }

  protected playAnimation(key: string) {
    if (this.sprite.anims.currentAnim?.key === key) {
      return;
    }

    this.sprite.play(key);
  }

  protected damagePlayer(amount = 1) {
    if (this.scene.isDead || this.scene.playerController.isInvincible()) {
      return false;
    }

    this.scene.damagePlayer(this.sprite.x, this.sprite.y, amount);
    return true;
  }

  protected getPlayerBounds() {
    const body = this.scene.player.body;
    return new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height);
  }

  private die(knockbackDirection: number) {
    if (this.isDead()) {
      return;
    }

    this.sprite.setData("dead", true);
    this.onDeathStarted();
    this.sprite.setTint(0xffffff);
    this.scene.cameras.main.shake(150, 0.015);
    this.sprite.setVelocity(knockbackDirection * 300, -200);

    this.scene.time.paused = true;
    setTimeout(() => {
      this.scene.time.paused = false;
    }, 80);

    this.spawnHitSparks();
    this.spawnLimbBurst();

    this.scene.time.delayedCall(80, () => {
      if (this.sprite.active) {
        this.destroy();
      }
    });
  }

  private spawnHitSparks() {
    const sparks = this.scene.add.particles(this.sprite.x, this.sprite.y, "coin_spin", {
      frame: 0,
      scale: { start: 0.2, end: 0 },
      speed: { min: 100, max: 400 },
      lifespan: 300,
      alpha: { start: 1, end: 0 },
      quantity: 10,
      emitting: false,
    });

    sparks.explode(15);
  }

  private spawnLimbBurst() {
    const { x, y } = this.sprite;

    for (let i = 0; i < 5; i += 1) {
      const part = this.scene.physics.add.sprite(
        x,
        y,
        "limbs",
        i === 0 ? "head" : "part",
      );
      part.setTint(0xa855f7);

      const angle = Math.random() * Math.PI * 2;
      const speed = 200 + Math.random() * 200;
      part.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      part.setAngularVelocity(Math.random() * 1000 - 500);

      this.scene.time.delayedCall(1000, () => {
        this.scene.tweens.add({
          targets: part,
          alpha: 0,
          duration: 500,
          onComplete: () => part.destroy(),
        });
      });
    }
  }
}
