import Phaser from "phaser";

import type Enemy from "@/game/enemies/Enemy";
import { registerComboHit } from "@/game/ui/hud";
import AttackData from "@/game/weapons/attackData";
import Katana from "@/game/weapons/katana";
import type { Weapon } from "@/game/weapons/weapon";
import type {
  AttackFinishedEvent,
  AttackHitEvent,
  AttackStartEvent,
  AttackableTarget,
} from "@/game/weapons/types";
import type Level1 from "@/game/scenes/Level1";

type AttackableSprite =
  | Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
  | Phaser.Types.Physics.Arcade.SpriteWithStaticBody;

export const OnAttackStarted = "OnAttackStarted";
export const OnAttackHit = "OnAttackHit";
export const OnAttackFinished = "OnAttackFinished";

const PARRY_STUN_MS = 900;
const PARRY_SLOW_MOTION_MS = 220;
const PARRY_COUNTER_WINDOW_MS = 900;
const PARRY_SHAKE_DURATION = 140;
const PARRY_SHAKE_INTENSITY = 0.0065;
const PARRY_PHYSICS_TIME_SCALE = 0.24;
const PARRY_TWEEN_TIME_SCALE = 0.3;
const PARRY_ANIMATION_TIME_SCALE = 0.3;
const COUNTER_ATTACK_DAMAGE = 2;

export default class CombatManager extends Phaser.Events.EventEmitter {
  private readonly scene: Level1;
  private weapon: Weapon;

  private comboIndex = -1;
  private comboExpiresAt = 0;
  private nextAttackReadyAt = 0;
  private queuedAttack = false;
  private queuedAttackReadyAt = 0;
  private currentAttack: AttackData | null = null;
  private attackStartedAt = 0;
  private attackEndsAt = 0;
  private hitTargets = new WeakSet<AttackableTarget>();
  private hitStopResumeTimeout: ReturnType<typeof setTimeout> | null = null;
  private hitStopActive = false;
  private slowMotionResumeTimeout: ReturnType<typeof setTimeout> | null = null;
  private slowMotionToken = 0;
  private counterAttackWindowUntil = 0;

  constructor(scene: Level1, weapon: Weapon = new Katana()) {
    super();
    this.scene = scene;
    this.weapon = weapon;
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.destroy();
    });
  }

  setWeapon(weapon: Weapon) {
    this.weapon = weapon;
    this.cancelAttack();
  }

  destroy() {
    if (this.hitStopResumeTimeout) {
      clearTimeout(this.hitStopResumeTimeout);
      this.hitStopResumeTimeout = null;
    }
    if (this.hitStopActive) {
      this.scene.scene.resume();
      this.hitStopActive = false;
    }
    if (this.slowMotionResumeTimeout) {
      clearTimeout(this.slowMotionResumeTimeout);
      this.slowMotionResumeTimeout = null;
    }
    if (!this.scene.isDead) {
      this.restoreTimeScales();
    }
    this.removeAllListeners();
  }

  update() {
    const now = this.scene.time.now;

    if (this.scene.controlsManager.parryPressed) {
      this.triggerParry();
    }

    if (this.scene.controlsManager.attackPressed) {
      this.triggerPrimaryAttack();
    }

    if (this.currentAttack) {
      this.processActiveHitbox(now);

      if (now >= this.attackEndsAt) {
        this.finishAttack(false);
      }
      return;
    }

    if (this.queuedAttack && now >= this.queuedAttackReadyAt && this.canStartAttack()) {
      this.startNextAttack();
      return;
    }

    if (now > this.comboExpiresAt) {
      this.comboIndex = -1;
      this.queuedAttack = false;
      this.queuedAttackReadyAt = 0;
    }
  }

  triggerPrimaryAttack() {
    const now = this.scene.time.now;

    if (this.currentAttack) {
      this.queueNextAttack();
      return false;
    }

    if (!this.canStartAttack()) {
      return false;
    }

    if (now < this.nextAttackReadyAt) {
      this.queuedAttack = true;
      this.queuedAttackReadyAt = this.nextAttackReadyAt;
      return false;
    }

    this.startNextAttack();
    return true;
  }

  cancelAttack() {
    if (this.currentAttack) {
      this.emitAttackFinished(true);
    }

    this.currentAttack = null;
    this.queuedAttack = false;
    this.queuedAttackReadyAt = 0;
    this.comboIndex = -1;
    this.comboExpiresAt = 0;
    this.nextAttackReadyAt = 0;
    this.scene.isAttacking = false;
    this.scene.playerController.clearAttack();
  }

  clearCounterAttackWindow() {
    this.counterAttackWindowUntil = 0;
  }

  private canStartAttack() {
    return !(
      this.scene.isDead ||
      this.scene.playerController.isHurt() ||
      this.scene.playerController.isFlipping() ||
      this.scene.playerController.isDashing()
    );
  }

  private canStartParry() {
    return !(
      this.scene.isDead ||
      this.scene.isAttacking ||
      this.scene.playerController.isHurt() ||
      this.scene.playerController.isFlipping() ||
      this.scene.playerController.isDashing()
    );
  }

  private triggerParry() {
    if (!this.canStartParry()) {
      return false;
    }

    const now = this.scene.time.now;
    const parryTarget = this.findParryTarget(now);
    if (!parryTarget) {
      return false;
    }

    const parried = parryTarget.parry(PARRY_STUN_MS);
    if (!parried) {
      return false;
    }

    this.counterAttackWindowUntil = now + PARRY_COUNTER_WINDOW_MS;
    this.scene.playSFX("parry");
    this.spawnParryBurst(parryTarget.sprite.x, parryTarget.sprite.y - 10);
    this.scene.cameras.main.shake(PARRY_SHAKE_DURATION, PARRY_SHAKE_INTENSITY, true);
    this.applyParrySlowMotion(PARRY_SLOW_MOTION_MS);
    return true;
  }

  private queueNextAttack() {
    if (!this.currentAttack) {
      return;
    }

    const queueOpensAt = this.attackStartedAt + this.currentAttack.queueOpenMs;
    if (this.scene.time.now < queueOpensAt) {
      return;
    }

    this.queuedAttack = true;
    this.queuedAttackReadyAt = Math.max(
      this.queuedAttackReadyAt,
      this.nextAttackReadyAt,
    );
  }

  private startNextAttack() {
    const now = this.scene.time.now;
    const shouldResetCombo = now > this.comboExpiresAt || this.comboIndex === -1;

    this.comboIndex = shouldResetCombo
      ? 0
      : (this.comboIndex + 1) % this.weapon.attacks.length;

    const attack = this.weapon.getAttack(this.comboIndex);

    this.currentAttack = attack;
    this.attackStartedAt = now;
    this.attackEndsAt = now + attack.durationMs;
    this.comboExpiresAt = this.attackEndsAt + attack.comboResetMs;
    this.nextAttackReadyAt = now + attack.cooldownMs;
    this.queuedAttack = false;
    this.queuedAttackReadyAt = 0;
    this.hitTargets = new WeakSet<AttackableTarget>();

    this.scene.isAttacking = true;
    this.scene.player.setVelocityX(0);
    this.scene.playerController.playAttack(attack.poseKey);
    this.scene.playSFX("slash");

    const attackStartedEvent: AttackStartEvent = {
      weapon: this.weapon,
      attack,
      attackIndex: this.comboIndex,
      startedAt: now,
    };

    this.emit(OnAttackStarted, attackStartedEvent);

    this.spawnSwingTrail(attack);
  }

  private finishAttack(cancelled: boolean) {
    if (!this.currentAttack) {
      return;
    }

    const finishedAttack = this.currentAttack;
    const finishedIndex = this.comboIndex;
    const shouldChain =
      !cancelled &&
      this.queuedAttack &&
      this.canStartAttack() &&
      this.scene.time.now >= this.queuedAttackReadyAt;

    this.scene.isAttacking = false;
    this.scene.playerController.clearAttack();
    this.currentAttack = null;

    const attackFinishedEvent: AttackFinishedEvent = {
      weapon: this.weapon,
      attack: finishedAttack,
      attackIndex: finishedIndex,
      finishedAt: this.scene.time.now,
      cancelled,
    };

    this.emit(OnAttackFinished, attackFinishedEvent);

    if (shouldChain) {
      this.queuedAttack = false;
      this.queuedAttackReadyAt = 0;
      this.startNextAttack();
      return;
    }

    if (cancelled) {
      this.queuedAttack = false;
      this.queuedAttackReadyAt = 0;
    }
  }

  private emitAttackFinished(cancelled: boolean) {
    if (!this.currentAttack) {
      return;
    }

    const finishedAttack = this.currentAttack;
    const finishedIndex = this.comboIndex;

    const attackFinishedEvent: AttackFinishedEvent = {
      weapon: this.weapon,
      attack: finishedAttack,
      attackIndex: finishedIndex,
      finishedAt: this.scene.time.now,
      cancelled,
    };

    this.emit(OnAttackFinished, attackFinishedEvent);
  }

  private processActiveHitbox(now: number) {
    if (!this.currentAttack) {
      return;
    }

    const activeStartsAt = this.attackStartedAt + this.currentAttack.activeStartMs;
    const activeEndsAt = this.attackStartedAt + this.currentAttack.activeEndMs;

    if (now < activeStartsAt || now > activeEndsAt) {
      return;
    }

    const direction = this.scene.player.flipX ? -1 : 1;
    const targets = this.collectAttackTargets();

    targets.forEach((target) => {
      if (!target.active || this.hitTargets.has(target)) {
        return;
      }

      if (!this.currentAttack?.hitbox.intersects(
        this.scene.player.x,
        this.scene.player.y,
        direction,
        target.body,
      )) {
        return;
      }

      this.hitTargets.add(target);
      this.handleTargetHit(target, direction);
    });
  }

  private collectAttackTargets() {
    const targets: AttackableTarget[] = [];

    if (this.scene.weaponTargets) {
      this.scene.weaponTargets.getChildren().forEach((target) => {
        if ("body" in target) {
          targets.push(target as AttackableTarget);
        }
      });
    }

    if (this.scene.enemies) {
      this.scene.enemies.getChildren().forEach((enemy) => {
        if ("body" in enemy) {
          targets.push(enemy as AttackableTarget);
        }
      });
    }

    return targets;
  }

  private handleTargetHit(target: AttackableTarget, direction: number) {
    if (!this.currentAttack) {
      return;
    }

    const sprite = target as AttackableSprite;
    const weaponHitEvent: AttackHitEvent = {
      weapon: this.weapon,
      attack: this.currentAttack,
      attackIndex: this.comboIndex,
      target,
      damage: this.currentAttack.damage,
      knockbackDirection: direction,
    };

    if (this.scene.enemies.getChildren().includes(target)) {
      const damageAmount = this.consumeCounterAttackBonusIfActive()
        ? Math.max(this.currentAttack.damage, COUNTER_ATTACK_DAMAGE)
        : this.currentAttack.damage;
      weaponHitEvent.damage = damageAmount;

      const damaged = this.scene.damageEnemy(
        sprite as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody,
        damageAmount,
        this.currentAttack.knockbackX,
        this.currentAttack.knockbackY,
      );
      if (damaged) {
        this.emit(OnAttackHit, weaponHitEvent);
        registerComboHit(this.scene);
        this.playKatanaImpact(sprite.x, sprite.y);
      }
      return;
    }

    this.scene.playSFX("punch");
    this.emit(OnAttackHit, weaponHitEvent);
    this.playKatanaImpact(sprite.x, sprite.y);
    this.sliceTrainingDummy(
      sprite as Phaser.Types.Physics.Arcade.SpriteWithStaticBody,
    );
  }

  private spawnSwingTrail(attack: AttackData) {
    const direction = this.scene.player.flipX ? -1 : 1;
    const originX = this.scene.player.x + attack.trail.offsetX * direction;
    const originY = this.scene.player.y + attack.trail.offsetY;
    const trail = this.scene.add.graphics();

    trail.setDepth(26);
    trail.setPosition(originX, originY);
    trail.setRotation(this.scene.player.flipX ? Math.PI : 0);
    this.drawTrailLayer(
      trail,
      attack.trail.radius + 3,
      attack.trail.startAngle,
      attack.trail.endAngle,
      12,
      attack.trail.strokeColor,
      0.18,
    );
    this.drawTrailLayer(
      trail,
      attack.trail.radius,
      attack.trail.startAngle,
      attack.trail.endAngle,
      6,
      attack.trail.strokeColor,
      0.42,
    );
    this.drawTrailLayer(
      trail,
      attack.trail.radius - 3,
      attack.trail.startAngle,
      attack.trail.endAngle,
      2,
      attack.trail.coreColor,
      0.92,
    );

    this.scene.tweens.add({
      targets: trail,
      alpha: 0,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: attack.trail.fadeMs,
      ease: "Sine.easeOut",
      onComplete: () => trail.destroy(),
    });
  }

  private drawTrailLayer(
    graphics: Phaser.GameObjects.Graphics,
    radius: number,
    startAngle: number,
    endAngle: number,
    width: number,
    color: number,
    alpha: number,
  ) {
    const steps = 12;

    graphics.lineStyle(width, color, alpha);
    for (let index = 0; index < steps; index += 1) {
      const progress = index / steps;
      const nextProgress = (index + 1) / steps;
      const fromAngle = Phaser.Math.Linear(startAngle, endAngle, progress);
      const toAngle = Phaser.Math.Linear(startAngle, endAngle, nextProgress);
      const fromX = Math.cos(fromAngle) * radius;
      const fromY = Math.sin(fromAngle) * radius;
      const toX = Math.cos(toAngle) * radius;
      const toY = Math.sin(toAngle) * radius;

      graphics.lineBetween(fromX, fromY, toX, toY);
    }
  }

  private playKatanaImpact(x: number, y: number) {
    this.spawnHitSpark(x, y);
    this.spawnSlashImpact(x, y);
    this.scene.cameras.main.shake(90, 0.0042, true);
    this.applyHitStop(50);
  }

  private spawnHitSpark(x: number, y: number) {
    const sparks = this.scene.add.particles(x, y, "dust_dot", {
      tint: [0xe0f2fe, 0x67e8f9, 0xffffff],
      speed: { min: 120, max: 360 },
      angle: { min: -160, max: 20 },
      lifespan: { min: 100, max: 220 },
      scale: { start: 1.5, end: 0 },
      alpha: { start: 0.9, end: 0 },
      quantity: 0,
      emitting: false,
    });

    sparks.explode(10);
    this.scene.time.delayedCall(220, () => {
      sparks.destroy();
    });
  }

  private spawnSlashImpact(x: number, y: number) {
    const slash = this.scene.add.graphics();
    const direction = this.scene.player.flipX ? -1 : 1;
    const angle = direction < 0 ? -0.55 : 0.55;

    slash.setDepth(27);
    slash.setPosition(x, y - 6);
    slash.setRotation(angle);

    slash.lineStyle(11, 0x67e8f9, 0.18);
    slash.lineBetween(-26, 10, 26, -10);
    slash.lineStyle(6, 0x38bdf8, 0.38);
    slash.lineBetween(-23, 8, 23, -8);
    slash.lineStyle(2.5, 0xffffff, 0.95);
    slash.lineBetween(-20, 6, 20, -6);
    slash.lineStyle(1.5, 0xe0f2fe, 0.8);
    slash.lineBetween(-10, 16, 6, 2);
    slash.lineBetween(-2, -2, 14, -16);

    this.scene.tweens.add({
      targets: slash,
      alpha: 0,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 120,
      ease: "Sine.easeOut",
      onComplete: () => slash.destroy(),
    });
  }

  private applyHitStop(durationMs: number) {
    if (!this.hitStopActive) {
      this.hitStopActive = true;
      this.scene.scene.pause();
    }

    if (this.hitStopResumeTimeout) {
      clearTimeout(this.hitStopResumeTimeout);
    }

    this.hitStopResumeTimeout = setTimeout(() => {
      this.hitStopResumeTimeout = null;
      this.hitStopActive = false;
      this.scene.scene.resume();
    }, durationMs);
  }

  private applyParrySlowMotion(durationMs: number) {
    this.slowMotionToken += 1;
    const token = this.slowMotionToken;

    this.scene.physics.world.timeScale = PARRY_PHYSICS_TIME_SCALE;
    this.scene.tweens.timeScale = PARRY_TWEEN_TIME_SCALE;
    this.scene.anims.globalTimeScale = PARRY_ANIMATION_TIME_SCALE;

    if (this.slowMotionResumeTimeout) {
      clearTimeout(this.slowMotionResumeTimeout);
    }

    this.slowMotionResumeTimeout = setTimeout(() => {
      if (this.scene.isDead || token !== this.slowMotionToken) {
        return;
      }

      this.slowMotionResumeTimeout = null;
      this.restoreTimeScales();
    }, durationMs);
  }

  private restoreTimeScales() {
    this.scene.physics.world.timeScale = 1;
    this.scene.tweens.timeScale = 1;
    this.scene.anims.globalTimeScale = 1;
  }

  private spawnParryBurst(x: number, y: number) {
    const burst = this.scene.add.graphics();
    burst.setDepth(31);
    burst.setPosition(x, y);

    burst.lineStyle(13, 0xf8fafc, 0.22);
    burst.strokeCircle(0, 0, 22);
    burst.lineStyle(7, 0x67e8f9, 0.55);
    burst.strokeCircle(0, 0, 18);
    burst.lineStyle(2.5, 0xffffff, 1);
    burst.lineBetween(-26, 0, 26, 0);
    burst.lineBetween(0, -26, 0, 26);
    burst.lineBetween(-18, -18, 18, 18);
    burst.lineBetween(-18, 18, 18, -18);

    this.scene.tweens.add({
      targets: burst,
      alpha: 0,
      scaleX: 1.22,
      scaleY: 1.22,
      duration: 170,
      ease: "Sine.easeOut",
      onComplete: () => burst.destroy(),
    });
  }

  private findParryTarget(now: number): Enemy | null {
    let closestTarget: Enemy | null = null;
    let closestDistance = Infinity;

    this.scene.enemyControllers.forEach((enemy) => {
      if (!enemy.canBeParried(now)) {
        return;
      }

      const distance = Phaser.Math.Distance.Between(
        this.scene.player.x,
        this.scene.player.y,
        enemy.sprite.x,
        enemy.sprite.y,
      );

      if (distance < closestDistance) {
        closestDistance = distance;
        closestTarget = enemy;
      }
    });

    return closestTarget;
  }

  private consumeCounterAttackBonusIfActive() {
    if (this.scene.time.now > this.counterAttackWindowUntil) {
      this.counterAttackWindowUntil = 0;
      return false;
    }

    if (this.counterAttackWindowUntil === 0) {
      return false;
    }

    this.counterAttackWindowUntil = 0;
    return true;
  }

  private sliceTrainingDummy(
    target: Phaser.Types.Physics.Arcade.SpriteWithStaticBody,
  ) {
    if (!target.active) {
      return;
    }

    const splinters = this.scene.add.particles(target.x, target.y - 12, "dust_dot", {
      tint: [0x14532d, 0x16a34a, 0x854d0e],
      speed: { min: 70, max: 260 },
      angle: { min: -150, max: 10 },
      gravityY: 680,
      lifespan: { min: 240, max: 520 },
      scale: { start: 1.8, end: 0.2 },
      alpha: { start: 0.95, end: 0 },
      quantity: 0,
      emitting: false,
    });

    splinters.explode(18);

    const slashMark = this.scene.add.graphics();
    slashMark.setDepth(24);
    slashMark.lineStyle(3, 0xffffff, 0.9);
    slashMark.lineBetween(target.x - 18, target.y - 10, target.x + 18, target.y + 18);
    this.scene.tweens.add({
      targets: slashMark,
      alpha: 0,
      duration: 180,
      onComplete: () => slashMark.destroy(),
    });

    target.destroy();

    this.scene.time.delayedCall(520, () => {
      splinters.destroy();
    });
  }
}
