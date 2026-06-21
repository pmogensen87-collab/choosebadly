import Phaser from "phaser";

import type Level1 from "@/game/scenes/Level1";

type TraversalWorld = {
  ladders: Phaser.Physics.Arcade.StaticGroup;
  ropes: Phaser.Physics.Arcade.StaticGroup;
  oneWayPlatforms: Phaser.Physics.Arcade.StaticGroup;
  ledges: Phaser.Physics.Arcade.StaticGroup;
};

type TraversalInput = {
  now: number;
  deltaSeconds: number;
  jumpPressed: boolean;
  jumpHeld: boolean;
  leftDown: boolean;
  rightDown: boolean;
  upDown: boolean;
  downDown: boolean;
};

type TraversalMode = "idle" | "ladder" | "rope" | "ledge" | "wall";

const LADDER_SPEED = 240;
const ROPE_RADIUS_MAX = 170;
const ROPE_SWING_ACCEL = 3.8;
const ROPE_SWING_DAMPING = 0.992;
const ROPE_WALK_TRANSFER = 2.2;
const ROPE_LAUNCH_SPEED = 390;
const LEDGE_CLIMB_MS = 150;
const WALL_SLIDE_SPEED = 150;
const WALL_JUMP_X = 430;
const WALL_JUMP_Y = -470;
const DROP_THROUGH_MS = 240;

export default class TraversalSystem {
  private readonly scene: Level1;
  private world: TraversalWorld | null = null;

  private mode: TraversalMode = "idle";
  private ropeAnchorX = 0;
  private ropeAnchorY = 0;
  private ropeLength = 0;
  private ropeAngle = 0;
  private ropeAngularVelocity = 0;
  private ropeSprite: Phaser.GameObjects.Sprite | null = null;
  private ledgeTargetX = 0;
  private ledgeTargetY = 0;
  private ledgeSprite: Phaser.GameObjects.Sprite | null = null;
  private dropThroughUntil = 0;

  constructor(scene: Level1) {
    this.scene = scene;
  }

  registerWorld(
    world: TraversalWorld,
    landingDust: Phaser.GameObjects.Particles.ParticleEmitter,
  ) {
    this.world = world;
    this.scene.physics.add.collider(
      this.scene.player,
      world.oneWayPlatforms,
      () => {
        const impactSpeed = Math.abs(this.scene.player.body.velocity.y);
        if (this.scene.player.body.touching.down && impactSpeed > 10) {
          landingDust.emitParticleAt(this.scene.player.x, this.scene.player.y + 24, 4);
          this.scene.cameraController.shakeOnLanding(impactSpeed);
        }
      },
      (player, platform) => this.shouldCollideWithOneWayPlatform(
        player as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody,
        platform as Phaser.Types.Physics.Arcade.SpriteWithStaticBody,
      ),
    );
  }

  update(input: TraversalInput) {
    if (!this.world) {
      return false;
    }

    this.cleanupExpiredStates(input.now);

    if (this.mode === "rope") {
      this.updateRope(input);
      return true;
    }

    if (this.mode === "ladder") {
      this.updateLadder(input);
      return true;
    }

    if (this.mode === "ledge") {
      this.updateLedge(input);
      return true;
    }

    if (this.mode === "wall") {
      this.updateWall(input);
      return true;
    }

    const ladder = this.findTouchedSensor(this.world.ladders);
    const rope = this.findTouchedSensor(this.world.ropes);
    const ledge = this.findTouchedSensor(this.world.ledges);

    if (this.tryDropThrough(input)) {
      return true;
    }

    if (this.tryStartLedgeClimb(input, ledge)) {
      return true;
    }

    if (this.tryStartRope(input, rope)) {
      return true;
    }

    if (this.tryStartLadder(input, ladder)) {
      return true;
    }

    if (this.shouldStartWallSlide(input)) {
      this.startWallSlide();
      this.updateWall(input);
      return true;
    }

    this.scene.isClimbing = false;
    return false;
  }

  isDroppingThroughPlatforms(now: number) {
    return now < this.dropThroughUntil;
  }

  cancelTraversal() {
    this.mode = "idle";
    this.ropeSprite = null;
    this.ledgeSprite = null;
    this.ropeAngularVelocity = 0;
    this.scene.player.body.allowGravity = true;
    this.scene.player.setVelocity(0, 0);
    this.scene.isClimbing = false;
  }

  private cleanupExpiredStates(now: number) {
    if (this.dropThroughUntil !== 0 && now >= this.dropThroughUntil) {
      this.dropThroughUntil = 0;
    }
  }

  private findTouchedSensor(
    group: Phaser.Physics.Arcade.StaticGroup,
  ) {
    const playerBounds = this.getPlayerBounds();
    return group.getChildren().find((child) => {
      const sensor = child as Phaser.GameObjects.Sprite;
      const body = sensor.body as Phaser.Physics.Arcade.StaticBody;
      if (!body) {
        return false;
      }

      const sensorBounds = new Phaser.Geom.Rectangle(
        body.x,
        body.y,
        body.width,
        body.height,
      );
      return Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, sensorBounds);
    }) as Phaser.GameObjects.Sprite | undefined;
  }

  private tryStartLadder(input: TraversalInput, ladder?: Phaser.GameObjects.Sprite) {
    if (!ladder) {
      return false;
    }

    if (!input.upDown && !input.downDown && this.mode !== "ladder") {
      return false;
    }

    this.mode = "ladder";
    this.ropeSprite = null;
    this.ledgeSprite = null;
    this.scene.isClimbing = true;
    this.alignToSensorX(ladder);
    this.scene.player.body.allowGravity = false;
    this.scene.player.setVelocity(0, 0);
    return true;
  }

  private updateLadder(input: TraversalInput) {
    const ladder = this.findTouchedSensor(this.world!.ladders);
    if (!ladder) {
      this.mode = "idle";
      this.scene.isClimbing = false;
      this.scene.player.body.allowGravity = true;
      return;
    }

    this.scene.isClimbing = true;
    this.alignToSensorX(ladder);
    this.scene.player.body.allowGravity = false;
    this.scene.player.setVelocityX(0);
    this.scene.player.setVelocityY(0);

    if (input.upDown) {
      this.scene.player.setVelocityY(-LADDER_SPEED);
    } else if (input.downDown) {
      this.scene.player.setVelocityY(LADDER_SPEED);
    }

    if (input.jumpPressed) {
      this.mode = "idle";
      this.scene.isClimbing = false;
      this.scene.player.body.allowGravity = true;
      this.scene.player.setVelocityY(-420);
      this.scene.player.setVelocityX(input.leftDown ? -220 : input.rightDown ? 220 : 0);
    }
  }

  private tryStartRope(input: TraversalInput, rope?: Phaser.GameObjects.Sprite) {
    if (!rope) {
      return false;
    }

    if (!input.upDown && !input.jumpPressed) {
      return false;
    }

    this.startRope(rope);
    return true;
  }

  private startRope(rope: Phaser.GameObjects.Sprite) {
    this.mode = "rope";
    this.scene.isClimbing = true;
    this.ropeSprite = rope;
    this.ledgeSprite = null;

    const body = rope.body as Phaser.Physics.Arcade.Body;
    this.ropeAnchorX = rope.getData("anchorX") ?? body.x + body.width * 0.5;
    this.ropeAnchorY = rope.getData("anchorY") ?? body.y;
    this.ropeLength = rope.getData("length") ?? Phaser.Math.Clamp(body.height * 0.5, 72, ROPE_RADIUS_MAX);

    const player = this.scene.player;
    const dx = player.x - this.ropeAnchorX;
    const dy = player.y - this.ropeAnchorY;
    this.ropeAngle = Phaser.Math.Angle.Wrap(Math.atan2(dx, dy));
    this.ropeAngularVelocity = 0;

    player.body.allowGravity = false;
    player.setVelocity(0, 0);
    this.snapPlayerToRope();
  }

  private updateRope(input: TraversalInput) {
    if (!this.ropeSprite) {
      this.mode = "idle";
      this.scene.isClimbing = false;
      this.scene.player.body.allowGravity = true;
      return;
    }

    this.scene.isClimbing = true;
    this.scene.player.body.allowGravity = false;

    const swingInput = (input.rightDown ? 1 : 0) - (input.leftDown ? 1 : 0);
    this.ropeAngularVelocity += swingInput * ROPE_SWING_ACCEL * input.deltaSeconds;
    this.ropeAngularVelocity *= ROPE_SWING_DAMPING;
    this.ropeAngle = Phaser.Math.Clamp(
      this.ropeAngle + this.ropeAngularVelocity * input.deltaSeconds,
      -1.25,
      1.25,
    );

    this.snapPlayerToRope();

    if (input.jumpPressed) {
      const tangentX = Math.cos(this.ropeAngle);
      const tangentY = -Math.sin(this.ropeAngle);
      this.scene.player.body.allowGravity = true;
      this.scene.player.setVelocity(
        tangentX * ROPE_LAUNCH_SPEED + swingInput * ROPE_WALK_TRANSFER * 80,
        tangentY * ROPE_LAUNCH_SPEED - 120,
      );
      this.mode = "idle";
      this.scene.isClimbing = false;
      this.ropeSprite = null;
      return;
    }

    if (input.downDown) {
      this.scene.player.body.allowGravity = true;
      this.mode = "idle";
      this.scene.isClimbing = false;
      this.ropeSprite = null;
    }
  }

  private tryStartLedgeClimb(input: TraversalInput, ledge?: Phaser.GameObjects.Sprite) {
    if (!ledge) {
      return false;
    }

    if (!(input.jumpPressed || input.upDown)) {
      return false;
    }

    this.mode = "ledge";
    this.ledgeSprite = ledge;
    this.ropeSprite = null;
    this.scene.isClimbing = true;
    this.ledgeTargetX = ledge.getData("mantleX") ?? ledge.x;
    this.ledgeTargetY = ledge.getData("mantleY") ?? ledge.y;
    this.scene.player.body.allowGravity = false;
    this.scene.player.setVelocity(0, 0);
    this.scene.tweens.add({
      targets: this.scene.player,
      x: this.ledgeTargetX,
      y: this.ledgeTargetY,
      duration: LEDGE_CLIMB_MS,
      ease: "Sine.easeOut",
      onComplete: () => {
        this.mode = "idle";
        this.scene.isClimbing = false;
        this.scene.player.body.allowGravity = true;
        this.scene.player.setVelocityY(40);
      },
    });
    return true;
  }

  private updateLedge(_input: TraversalInput) {
    void _input;
    this.scene.isClimbing = true;
    this.scene.player.body.allowGravity = false;
    this.scene.player.setVelocity(0, 0);
  }

  private shouldStartWallSlide(input: TraversalInput) {
    const body = this.scene.player.body;
    if (body.blocked.down) {
      return false;
    }

    const pushingLeft = input.leftDown && body.blocked.left;
    const pushingRight = input.rightDown && body.blocked.right;
    return (pushingLeft || pushingRight) && body.velocity.y > 0;
  }

  private startWallSlide() {
    this.mode = "wall";
    this.scene.isClimbing = false;
  }

  private updateWall(input: TraversalInput) {
    const body = this.scene.player.body;
    const touchingLeft = body.blocked.left;
    const touchingRight = body.blocked.right;

    if (body.blocked.down || (!touchingLeft && !touchingRight)) {
      this.mode = "idle";
      this.scene.player.body.allowGravity = true;
      return;
    }

    this.scene.player.body.allowGravity = true;
    this.scene.player.setVelocityX(0);
    this.scene.player.setVelocityY(Math.min(body.velocity.y, WALL_SLIDE_SPEED));

    if (input.jumpPressed) {
      const pushDirection = touchingLeft ? 1 : -1;
      this.scene.player.setVelocityX(pushDirection * WALL_JUMP_X);
      this.scene.player.setVelocityY(WALL_JUMP_Y);
      this.scene.player.setFlipX(pushDirection < 0);
      this.mode = "idle";
      return;
    }
  }

  private tryDropThrough(input: TraversalInput) {
    if (!input.downDown || !input.jumpPressed) {
      return false;
    }

    const platform = this.findTouchedSensor(this.world!.oneWayPlatforms);
    if (!platform) {
      return false;
    }

    this.dropThroughUntil = input.now + DROP_THROUGH_MS;
    this.scene.player.setVelocityY(160);
    this.scene.player.body.allowGravity = true;
    this.mode = "idle";
    return true;
  }

  private shouldCollideWithOneWayPlatform(
    player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody,
    platform: Phaser.Types.Physics.Arcade.SpriteWithStaticBody,
  ) {
    if (this.dropThroughUntil > this.scene.time.now) {
      return false;
    }

    const playerBody = player.body;
    const platformBody = platform.body as Phaser.Physics.Arcade.StaticBody;
    return playerBody.velocity.y >= 0 && playerBody.bottom <= platformBody.top + 16;
  }

  private alignToSensorX(sensor: Phaser.GameObjects.Sprite) {
    const body = sensor.body as Phaser.Physics.Arcade.Body;
    this.scene.player.x = body.center.x;
  }

  private snapPlayerToRope() {
    const player = this.scene.player;
    const x = this.ropeAnchorX + Math.sin(this.ropeAngle) * this.ropeLength;
    const y = this.ropeAnchorY + Math.cos(this.ropeAngle) * this.ropeLength;
    player.setPosition(x, y);
    player.setVelocity(0, 0);
    player.body.allowGravity = false;
  }

  private getPlayerBounds() {
    const body = this.scene.player.body;
    return new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height);
  }
}

export type { TraversalInput, TraversalWorld };
