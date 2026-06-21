import Phaser from "phaser";

import type { MovementKeys } from "@/game/managers/level1Types";
import type Level1 from "@/game/scenes/Level1";
import { handleTubeInteraction } from "@/game/world/levelBuilder";

const COYOTE_TIME_MS = 110;
const JUMP_BUFFER_MS = 120;
const EXTRA_FALL_GRAVITY = 1400;
const JUMP_CUT_GRAVITY = 2200;
const JUMP_RELEASE_CUT = 0.58;
const FLIP_DOUBLE_TAP_MS = 250;
const FLIP_COOLDOWN_MS = 900;
const FLIP_DURATION_MS = 340;
const FLIP_FORWARD_SPEED = 620;
const FLIP_UPWARD_BOOST = -220;
const DASH_DURATION_MS = 170;
const DASH_COOLDOWN_MS = 550;
const DASH_SPEED = 860;
const DASH_UPWARD_ASSIST = -90;
const DASH_AFTERIMAGE_INTERVAL_MS = 45;
const PLAYER_BODY_WIDTH = 24;
const PLAYER_BODY_HEIGHT = 48;
const FLIP_BODY_WIDTH = 22;
const FLIP_BODY_HEIGHT = 30;
const DASH_BODY_WIDTH = 22;
const DASH_BODY_HEIGHT = 28;
const SPRINT_SPEED = 380;
const SPRINT_JUMP_SPEED = -470;
const MAX_HEALTH = 5;
const DAMAGE_INVULNERABILITY_MS = 900;
const DAMAGE_FLASH_MS = 120;
const DAMAGE_FLICKER_INTERVAL_MS = 70;
const DAMAGE_STUN_MS = 160;
const DAMAGE_KNOCKBACK_X = 290;
const DAMAGE_KNOCKBACK_Y = -230;
const STICKMAN_COLOR = 0xe2e8f0;
const DAMAGE_FLASH_COLOR = 0xffffff;
const KATANA_BLADE_COLOR = 0xe0f2fe;
const KATANA_EDGE_COLOR = 0x67e8f9;
const KATANA_HANDLE_COLOR = 0x8b5e34;
const KATANA_SHEATH_COLOR = 0x082f49;

type PlayerPose = "idle" | "walk" | "jump" | string;

export default class Player {
  readonly sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;

  private readonly scene: Level1;
  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly keys: MovementKeys;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly toggleFullscreen: () => void;

  private attackPose: string | null = null;
  private renderVisible = true;
  private walkCycle = 0;
  private coyoteUntil = 0;
  private jumpBufferedUntil = 0;
  private jumpConsumed = false;
  private wasJumpHeld = false;
  private lastSpaceTapAt = -Infinity;
  private flipCooldownUntil = 0;
  private flipUntil = 0;
  private flipDirection = 1;
  private flipRotation = 0;
  private dashDirection = 1;
  private dashUntil = 0;
  private dashCooldownUntil = 0;
  private lastDashAfterImageAt = -Infinity;
  private health = MAX_HEALTH;
  private damageInvulnerableUntil = 0;
  private damageFlashUntil = 0;
  private hurtUntil = 0;

  constructor(scene: Level1) {
    this.scene = scene;
    this.sprite = scene.physics.add.sprite(100, 450, "player_body");
    this.sprite.setSize(PLAYER_BODY_WIDTH, PLAYER_BODY_HEIGHT);
    this.sprite.setCollideWorldBounds(false);
    this.sprite.setAlpha(0);

    this.graphics = scene.add.graphics();
    this.graphics.setDepth(30);

    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.keys = scene.input.keyboard!.addKeys(
      "A,D,W,S,SHIFT",
    ) as MovementKeys;

    this.toggleFullscreen = () => {
      if (scene.scale.isFullscreen) {
        scene.scale.stopFullscreen();
      } else {
        scene.scale.startFullscreen();
      }
    };
    scene.input.keyboard?.on("keydown-F", this.toggleFullscreen);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.input.keyboard?.off("keydown-F", this.toggleFullscreen);
    });

    this.draw();
  }

  playAttack(type: string) {
    this.attackPose = type;
    this.draw();
  }

  clearAttack() {
    this.attackPose = null;
    this.draw();
  }

  getHealth() {
    return this.health;
  }

  getMaxHealth() {
    return MAX_HEALTH;
  }

  isFlipping() {
    return this.flipUntil > this.scene.time.now;
  }

  isDashing() {
    return this.dashUntil > this.scene.time.now;
  }

  isInvincible() {
    return this.isDashing() || this.damageInvulnerableUntil > this.scene.time.now;
  }

  isHurt() {
    return this.hurtUntil > this.scene.time.now;
  }

  takeDamage(sourceX?: number, sourceY?: number, amount = 1) {
    if (this.scene.isDead || this.isInvincible()) {
      return false;
    }

    this.scene.combatManager.cancelAttack();
    this.scene.isAttacking = false;
    this.attackPose = null;
    this.scene.isClimbing = false;
    this.jumpBufferedUntil = 0;
    this.coyoteUntil = 0;
    this.jumpConsumed = true;
    this.cancelTransientStates();

    this.health = Math.max(0, this.health - amount);
    this.damageInvulnerableUntil = this.scene.time.now + DAMAGE_INVULNERABILITY_MS;
    this.damageFlashUntil = this.scene.time.now + DAMAGE_FLASH_MS;
    this.hurtUntil = this.scene.time.now + DAMAGE_STUN_MS;

    const direction = this.resolveDamageKnockbackDirection(sourceX);
    const verticalKnockback =
      sourceY !== undefined && sourceY < this.sprite.y
        ? DAMAGE_KNOCKBACK_Y * 0.85
        : DAMAGE_KNOCKBACK_Y;

    this.sprite.body.allowGravity = true;
    this.sprite.setFlipX(direction < 0);
    this.sprite.setVelocityX(direction * DAMAGE_KNOCKBACK_X);
    this.sprite.setVelocityY(verticalKnockback);

    this.scene.updateHUD();
    this.draw();

    if (this.health <= 0) {
      this.scene.killPlayer();
    }

    return true;
  }

  cancelTransientStates() {
    this.finishDash();
    this.finishFlip();
    this.scene.traversalSystem.cancelTraversal();
  }

  setRenderVisible(visible: boolean) {
    this.renderVisible = visible;
    this.graphics.setVisible(visible);
  }

  update() {
    const now = this.scene.time.now;
    const deltaSeconds = this.scene.game.loop.delta / 1000;
    const wasClimbing = this.scene.isClimbing;
    this.scene.isClimbing = false;

    const spaceJustPressed = Phaser.Input.Keyboard.JustDown(this.cursors.space);
    const shiftJustPressed = Phaser.Input.Keyboard.JustDown(this.keys.SHIFT);
    const jumpHeld = this.isJumpHeld();
    const jumpPressed = this.didPressJump(spaceJustPressed);
    const isGrounded = this.sprite.body.blocked.down;

    if (this.flipUntil !== 0 && now >= this.flipUntil) {
      this.finishFlip();
    }
    if (this.dashUntil !== 0 && now >= this.dashUntil) {
      this.finishDash();
    }

    if (isGrounded) {
      this.coyoteUntil = now + COYOTE_TIME_MS;
      this.jumpConsumed = false;
    }

    const startedDash = this.isHurt()
      ? false
      : this.tryStartDash(now, shiftJustPressed, wasClimbing);
    const startedFlip = !startedDash
      ? (this.isHurt()
        ? false
        : this.tryStartFlip(now, spaceJustPressed, wasClimbing))
      : false;

    if (jumpPressed && !startedFlip) {
      this.jumpBufferedUntil = now + JUMP_BUFFER_MS;
    }

    const isSprinting = this.keys.SHIFT.isDown && !this.isDashing();
    const speed = isSprinting ? SPRINT_SPEED : 300;
    const jumpSpeed = isSprinting ? SPRINT_JUMP_SPEED : -450;

    if (Phaser.Input.Keyboard.JustDown(this.keys.S)) {
      handleTubeInteraction(this.scene);
    }

    if (this.scene.isAttacking) {
      this.applyJumpGravity(deltaSeconds, jumpHeld, wasClimbing);
      this.updateWalkCycle();
      this.draw();
      this.wasJumpHeld = jumpHeld;
      return;
    }

    if (this.isHurt()) {
      this.updateHurt(deltaSeconds, jumpHeld);
      this.updateWalkCycle();
      this.draw();
      this.wasJumpHeld = jumpHeld;
      return;
    }

    if (this.isDashing()) {
      this.updateDash(deltaSeconds, jumpHeld, wasClimbing);
      this.updateWalkCycle();
      this.draw();
      this.wasJumpHeld = jumpHeld;
      return;
    }

    if (this.isFlipping()) {
      this.updateFlip(now, deltaSeconds, jumpHeld, wasClimbing);
      this.updateWalkCycle();
      this.draw();
      this.wasJumpHeld = jumpHeld;
      return;
    }

    const traversalHandled = this.scene.traversalSystem.update({
      now,
      deltaSeconds,
      jumpPressed,
      jumpHeld,
      leftDown: this.cursors.left.isDown || this.keys.A.isDown,
      rightDown: this.cursors.right.isDown || this.keys.D.isDown,
      upDown: this.cursors.up.isDown || this.keys.W.isDown,
      downDown: this.cursors.down.isDown || this.keys.S.isDown,
    });

    if (traversalHandled) {
      this.jumpBufferedUntil = 0;
      this.jumpConsumed = true;
      this.updateWalkCycle();
      this.draw();
      this.wasJumpHeld = jumpHeld;
      if (this.sprite.y > 620) {
        this.scene.killPlayer();
      }
      return;
    }

    this.sprite.setVelocityX(0);

    if (wasClimbing) {
      this.sprite.body.allowGravity = false;
      this.sprite.setVelocityY(0);

      if (this.keys.W.isDown || this.cursors.up.isDown) {
        this.sprite.setVelocityY(-200);
      } else if (this.keys.S.isDown || this.cursors.down.isDown) {
        this.sprite.setVelocityY(200);
      }
    } else {
      this.sprite.body.allowGravity = true;
    }

    if (this.cursors.left.isDown || this.keys.A.isDown) {
      this.sprite.setVelocityX(-speed);
      this.sprite.setFlipX(true);
    }

    if (this.cursors.right.isDown || this.keys.D.isDown) {
      this.sprite.setVelocityX(speed);
      this.sprite.setFlipX(false);
    }

    if (
      isSprinting &&
      Math.abs(this.sprite.body.velocity.x) > 0 &&
      Math.random() > 0.4
    ) {
      this.spawnGhostTrail();
    }

    this.tryConsumeBufferedJump(now, jumpSpeed, wasClimbing);
    this.applyJumpGravity(deltaSeconds, jumpHeld, wasClimbing);

    this.updateWalkCycle();
    this.draw();
    this.wasJumpHeld = jumpHeld;

    if (this.sprite.y > 620) {
      this.scene.killPlayer();
    }
  }

  private isJumpHeld() {
    return (
      this.cursors.space.isDown ||
      this.cursors.up.isDown ||
      this.keys.W.isDown
    );
  }

  private didPressJump(spaceJustPressed: boolean) {
    return (
      spaceJustPressed ||
      Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this.keys.W)
    );
  }

  private tryStartDash(
    now: number,
    shiftJustPressed: boolean,
    wasClimbing: boolean,
  ) {
    if (!shiftJustPressed) {
      return false;
    }

    if (
      now < this.dashCooldownUntil ||
      this.scene.isAttacking ||
      this.isFlipping() ||
      wasClimbing
    ) {
      return false;
    }

    this.dashDirection = this.resolveDashDirection();
    this.dashUntil = now + DASH_DURATION_MS;
    this.dashCooldownUntil = now + DASH_COOLDOWN_MS;
    this.lastDashAfterImageAt = -Infinity;
    this.jumpBufferedUntil = 0;
    this.sprite.setFlipX(this.dashDirection < 0);
    this.sprite.body.allowGravity = true;
    this.sprite.body.setSize(DASH_BODY_WIDTH, DASH_BODY_HEIGHT, true);
    this.sprite.setVelocityX(this.dashDirection * DASH_SPEED);
    this.sprite.setVelocityY(
      Math.min(this.sprite.body.velocity.y, DASH_UPWARD_ASSIST),
    );
    this.scene.cameraController.setDashZoomActive(true);

    return true;
  }

  private resolveDashDirection() {
    if (this.cursors.left.isDown || this.keys.A.isDown) {
      return -1;
    }

    if (this.cursors.right.isDown || this.keys.D.isDown) {
      return 1;
    }

    if (this.sprite.body.velocity.x < 0) {
      return -1;
    }

    if (this.sprite.body.velocity.x > 0) {
      return 1;
    }

    return this.sprite.flipX ? -1 : 1;
  }

  private updateDash(
    deltaSeconds: number,
    jumpHeld: boolean,
    wasClimbing: boolean,
  ) {
    this.sprite.body.allowGravity = true;
    this.sprite.body.setSize(DASH_BODY_WIDTH, DASH_BODY_HEIGHT, true);
    this.sprite.setVelocityX(this.dashDirection * DASH_SPEED);

    if (
      this.scene.time.now - this.lastDashAfterImageAt >= DASH_AFTERIMAGE_INTERVAL_MS
    ) {
      this.lastDashAfterImageAt = this.scene.time.now;
      this.spawnGhostTrail(0x7dd3fc, 0.32);
    }

    this.applyJumpGravity(deltaSeconds, jumpHeld, wasClimbing);

    if (this.sprite.y > 620) {
      this.scene.killPlayer();
    }
  }

  private finishDash() {
    if (this.dashUntil === 0) {
      this.scene.cameraController.setDashZoomActive(false);
      return;
    }

    this.dashUntil = 0;
    this.lastDashAfterImageAt = -Infinity;
    this.scene.cameraController.setDashZoomActive(false);
    this.sprite.body.setSize(PLAYER_BODY_WIDTH, PLAYER_BODY_HEIGHT, true);
  }

  private tryStartFlip(
    now: number,
    spaceJustPressed: boolean,
    wasClimbing: boolean,
  ) {
    if (!spaceJustPressed) {
      return false;
    }

    const tappedWithinWindow = now - this.lastSpaceTapAt <= FLIP_DOUBLE_TAP_MS;
    this.lastSpaceTapAt = now;

    if (
      !tappedWithinWindow ||
      now < this.flipCooldownUntil ||
      this.scene.isAttacking ||
      this.isDashing() ||
      wasClimbing
    ) {
      return false;
    }

    const direction = this.sprite.flipX ? -1 : 1;
    this.flipDirection = direction;
    this.flipRotation = 0;
    this.flipUntil = now + FLIP_DURATION_MS;
    this.flipCooldownUntil = now + FLIP_COOLDOWN_MS;
    this.jumpBufferedUntil = 0;
    this.lastSpaceTapAt = -Infinity;

    this.sprite.body.allowGravity = true;
    this.sprite.body.setSize(FLIP_BODY_WIDTH, FLIP_BODY_HEIGHT, true);
    this.sprite.setVelocityX(direction * FLIP_FORWARD_SPEED);
    this.sprite.setVelocityY(
      Math.min(this.sprite.body.velocity.y, FLIP_UPWARD_BOOST),
    );

    return true;
  }

  private updateFlip(
    now: number,
    deltaSeconds: number,
    jumpHeld: boolean,
    wasClimbing: boolean,
  ) {
    const progress = 1 - (this.flipUntil - now) / FLIP_DURATION_MS;
    this.flipRotation = progress * Math.PI * 2 * this.flipDirection;
    this.sprite.body.allowGravity = true;
    this.sprite.body.setSize(FLIP_BODY_WIDTH, FLIP_BODY_HEIGHT, true);
    this.sprite.setVelocityX(this.flipDirection * FLIP_FORWARD_SPEED);

    if (
      this.sprite.body.velocity.y >= 0 &&
      this.sprite.body.blocked.down
    ) {
      this.finishFlip();
    } else {
      this.applyJumpGravity(deltaSeconds, jumpHeld, wasClimbing);
    }

    if (this.sprite.y > 620) {
      this.scene.killPlayer();
    }
  }

  private finishFlip() {
    if (this.flipUntil === 0) {
      return;
    }

    this.flipUntil = 0;
    this.flipRotation = 0;
    this.sprite.body.setSize(PLAYER_BODY_WIDTH, PLAYER_BODY_HEIGHT, true);
  }

  private updateHurt(
    deltaSeconds: number,
    jumpHeld: boolean,
  ) {
    this.sprite.body.allowGravity = true;
    this.applyJumpGravity(deltaSeconds, jumpHeld, false);

    if (this.sprite.y > 620) {
      this.scene.killPlayer();
    }
  }

  private tryConsumeBufferedJump(
    now: number,
    jumpSpeed: number,
    wasClimbing: boolean,
  ) {
    if (wasClimbing || this.jumpBufferedUntil < now) {
      return;
    }

    const canJumpFromGround = this.sprite.body.blocked.down;
    const canJumpFromCoyote = !this.jumpConsumed && now <= this.coyoteUntil;

    if (!canJumpFromGround && !canJumpFromCoyote) {
      return;
    }

    this.jumpBufferedUntil = 0;
    this.jumpConsumed = true;
    this.coyoteUntil = 0;
    this.sprite.setVelocityY(jumpSpeed);
    this.scene.playSFX("jump");
    this.scene.tweens.add({
      targets: this.sprite,
      scaleY: 1.3,
      scaleX: 0.8,
      duration: 100,
      yoyo: true,
      ease: "Quad.easeOut",
    });
  }

  private applyJumpGravity(
    deltaSeconds: number,
    jumpHeld: boolean,
    wasClimbing: boolean,
  ) {
    if (wasClimbing || !this.sprite.body.allowGravity) {
      return;
    }

    const velocityY = this.sprite.body.velocity.y;

    if (velocityY < 0 && !jumpHeld) {
      const cutVelocityY = this.wasJumpHeld
        ? velocityY * JUMP_RELEASE_CUT
        : velocityY;
      this.sprite.setVelocityY(
        cutVelocityY + JUMP_CUT_GRAVITY * deltaSeconds,
      );
      return;
    }

    if (velocityY > 0) {
      this.sprite.setVelocityY(velocityY + EXTRA_FALL_GRAVITY * deltaSeconds);
    }
  }

  private updateWalkCycle() {
    const delta = this.scene.game.loop.delta / 1000;
    const horizontalSpeed = Math.abs(this.sprite.body.velocity.x);

    if (this.sprite.body.blocked.down && horizontalSpeed > 0) {
      this.walkCycle += delta * Math.max(8, horizontalSpeed / 18);
      return;
    }

    this.walkCycle += delta * 2;
  }

  private draw() {
    if (!this.renderVisible) {
      this.graphics.clear();
      return;
    }

    const pose = this.resolvePose();
    const walkSwing = pose === "walk" ? Math.sin(this.walkCycle) : 0;
    const armSwing = walkSwing * 9;
    const legSwing = walkSwing * 10;

    this.graphics.clear();
    this.graphics.setVisible(true);
    this.graphics.setPosition(this.sprite.x, this.sprite.y);
    this.graphics.setScale(
      Math.abs(this.sprite.scaleX) * (this.sprite.flipX ? -1 : 1),
      this.sprite.scaleY,
    );
    this.graphics.setRotation(this.flipRotation);
    this.graphics.setAlpha(this.resolveRenderAlpha());
    this.graphics.lineStyle(
      this.scene.time.now < this.damageFlashUntil ? 4 : 3,
      this.scene.time.now < this.damageFlashUntil
        ? DAMAGE_FLASH_COLOR
        : STICKMAN_COLOR,
      1,
    );

    this.graphics.strokeCircle(0, -18, 7);
    this.graphics.lineBetween(0, -11, 0, 7);

    if (pose === "jump") {
      this.graphics.lineBetween(0, -7, -10, -18);
      this.graphics.lineBetween(0, -7, 10, -18);
      this.graphics.lineBetween(0, 7, -8, 21);
      this.graphics.lineBetween(0, 7, 8, 16);
      this.drawSheathedKatana(this.graphics);
      return;
    }

    if (pose === "katana_slash_1") {
      this.graphics.lineBetween(0, -7, -10, 2);
      this.graphics.lineBetween(0, -7, 12, -10);
      this.graphics.lineBetween(0, 7, -8, 22);
      this.graphics.lineBetween(0, 7, 8, 18);
      this.drawKatana(this.graphics, 12, -10, 30, -24);
      return;
    }

    if (pose === "katana_slash_2") {
      this.graphics.lineBetween(0, -7, -11, -6);
      this.graphics.lineBetween(0, -7, 14, 4);
      this.graphics.lineBetween(0, 7, -6, 22);
      this.graphics.lineBetween(0, 7, 12, 16);
      this.drawKatana(this.graphics, 14, 4, 31, 13);
      return;
    }

    if (pose === "katana_slash_3") {
      this.graphics.lineBetween(0, -7, -10, 0);
      this.graphics.lineBetween(0, -7, 4, -21);
      this.graphics.lineBetween(0, 7, -6, 22);
      this.graphics.lineBetween(0, 7, 10, 20);
      this.drawKatana(this.graphics, 4, -21, 17, -43);
      return;
    }

    if (pose === "walk") {
      this.graphics.lineBetween(0, -7, -armSwing, 4);
      this.graphics.lineBetween(0, -7, armSwing, 4);
      this.graphics.lineBetween(0, 7, legSwing, 22);
      this.graphics.lineBetween(0, 7, -legSwing, 22);
      this.drawSheathedKatana(this.graphics);
      return;
    }

    this.graphics.lineBetween(0, -7, -8, 2);
    this.graphics.lineBetween(0, -7, 8, 2);
    this.graphics.lineBetween(0, 7, -6, 22);
    this.graphics.lineBetween(0, 7, 6, 22);
    this.drawSheathedKatana(this.graphics);
  }

  private resolvePose(): PlayerPose {
    if (this.attackPose) {
      return this.attackPose;
    }

    if (
      this.isHurt() ||
      this.isDashing() ||
      this.flipUntil > this.scene.time.now ||
      !this.sprite.body.blocked.down
    ) {
      return "jump";
    }

    if (Math.abs(this.sprite.body.velocity.x) > 0) {
      return "walk";
    }

    return "idle";
  }

  private spawnGhostTrail(color = 0x38bdf8, alpha = 0.45) {
    const ghost = this.scene.add.graphics();
    ghost.setDepth(29);
    ghost.setAlpha(alpha);
    ghost.setPosition(this.sprite.x, this.sprite.y);
    ghost.setScale(
      Math.abs(this.sprite.scaleX) * (this.sprite.flipX ? -1 : 1),
      this.sprite.scaleY,
    );
    ghost.setRotation(this.flipRotation);

    this.drawGhost(ghost, this.resolvePose(), color);

    this.scene.tweens.add({
      targets: ghost,
      alpha: 0,
      duration: 200,
      onComplete: () => ghost.destroy(),
    });
  }

  private drawGhost(
    ghost: Phaser.GameObjects.Graphics,
    pose: PlayerPose,
    color: number,
  ) {
    const walkSwing = pose === "walk" ? Math.sin(this.walkCycle) : 0;
    const armSwing = walkSwing * 9;
    const legSwing = walkSwing * 10;

    ghost.clear();
    ghost.lineStyle(3, color, 1);
    ghost.strokeCircle(0, -18, 7);
    ghost.lineBetween(0, -11, 0, 7);

    if (pose === "jump") {
      ghost.lineBetween(0, -7, -10, -18);
      ghost.lineBetween(0, -7, 10, -18);
      ghost.lineBetween(0, 7, -8, 21);
      ghost.lineBetween(0, 7, 8, 16);
      this.drawGhostSheathedKatana(ghost, color);
      return;
    }

    if (pose === "katana_slash_1") {
      ghost.lineBetween(0, -7, -10, 2);
      ghost.lineBetween(0, -7, 12, -10);
      ghost.lineBetween(0, 7, -8, 22);
      ghost.lineBetween(0, 7, 8, 18);
      this.drawGhostKatana(ghost, 12, -10, 30, -24, color);
      return;
    }

    if (pose === "katana_slash_2") {
      ghost.lineBetween(0, -7, -11, -6);
      ghost.lineBetween(0, -7, 14, 4);
      ghost.lineBetween(0, 7, -6, 22);
      ghost.lineBetween(0, 7, 12, 16);
      this.drawGhostKatana(ghost, 14, 4, 31, 13, color);
      return;
    }

    if (pose === "katana_slash_3") {
      ghost.lineBetween(0, -7, -10, 0);
      ghost.lineBetween(0, -7, 4, -21);
      ghost.lineBetween(0, 7, -6, 22);
      ghost.lineBetween(0, 7, 10, 20);
      this.drawGhostKatana(ghost, 4, -21, 17, -43, color);
      return;
    }

    if (pose === "walk") {
      ghost.lineBetween(0, -7, -armSwing, 4);
      ghost.lineBetween(0, -7, armSwing, 4);
      ghost.lineBetween(0, 7, legSwing, 22);
      ghost.lineBetween(0, 7, -legSwing, 22);
      this.drawGhostSheathedKatana(ghost, color);
      return;
    }

    ghost.lineBetween(0, -7, -8, 2);
    ghost.lineBetween(0, -7, 8, 2);
    ghost.lineBetween(0, 7, -6, 22);
    ghost.lineBetween(0, 7, 6, 22);
    this.drawGhostSheathedKatana(ghost, color);
  }

  private drawKatana(
    graphics: Phaser.GameObjects.Graphics,
    handX: number,
    handY: number,
    tipX: number,
    tipY: number,
  ) {
    graphics.lineStyle(5, KATANA_HANDLE_COLOR, 1);
    graphics.lineBetween(handX - 6, handY + 2, handX, handY);
    graphics.lineStyle(3, KATANA_EDGE_COLOR, 1);
    graphics.lineBetween(handX, handY, tipX, tipY);
    graphics.lineStyle(1.5, KATANA_BLADE_COLOR, 0.95);
    graphics.lineBetween(handX + 1, handY - 1, tipX - 2, tipY - 2);
  }

  private drawSheathedKatana(graphics: Phaser.GameObjects.Graphics) {
    graphics.lineStyle(5, KATANA_SHEATH_COLOR, 0.95);
    graphics.lineBetween(-5, 2, -14, 20);
    graphics.lineStyle(3, KATANA_HANDLE_COLOR, 1);
    graphics.lineBetween(-3, -2, -8, 8);
  }

  private drawGhostKatana(
    graphics: Phaser.GameObjects.Graphics,
    handX: number,
    handY: number,
    tipX: number,
    tipY: number,
    color: number,
  ) {
    graphics.lineStyle(4, color, 0.8);
    graphics.lineBetween(handX - 5, handY + 1, handX, handY);
    graphics.lineStyle(2, color, 0.95);
    graphics.lineBetween(handX, handY, tipX, tipY);
  }

  private drawGhostSheathedKatana(
    graphics: Phaser.GameObjects.Graphics,
    color: number,
  ) {
    graphics.lineStyle(4, color, 0.4);
    graphics.lineBetween(-5, 2, -14, 20);
    graphics.lineStyle(2, color, 0.55);
    graphics.lineBetween(-3, -2, -8, 8);
  }

  private resolveDamageKnockbackDirection(sourceX?: number) {
    if (sourceX === undefined) {
      return this.sprite.flipX ? 1 : -1;
    }

    const deltaX = this.sprite.x - sourceX;
    if (Math.abs(deltaX) > 6) {
      return Math.sign(deltaX);
    }

    return this.sprite.flipX ? 1 : -1;
  }

  private resolveRenderAlpha() {
    const now = this.scene.time.now;

    if (now < this.damageFlashUntil) {
      return 1;
    }

    if (now >= this.damageInvulnerableUntil) {
      return 1;
    }

    return Math.floor(now / DAMAGE_FLICKER_INTERVAL_MS) % 2 === 0 ? 0.35 : 1;
  }
}
