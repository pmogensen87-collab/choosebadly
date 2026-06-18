import Phaser from "phaser";

import {
  CAMERA_HEIGHT,
  CAMERA_WIDTH,
  LEVEL_HEIGHT,
  LEVEL_WIDTH,
} from "@/game/managers/level1Types";
import type Level1 from "@/game/scenes/Level1";

const DEADZONE_WIDTH = CAMERA_WIDTH * 0.22;
const DEADZONE_HEIGHT = CAMERA_HEIGHT * 0.18;
const MAX_LOOK_AHEAD_X = 72;
const MIN_LOOK_AHEAD_SPEED = 20;
const BASE_ZOOM = 1;
const DASH_ZOOM = 1.04;

export default class CameraController {
  private readonly scene: Level1;
  private readonly camera: Phaser.Cameras.Scene2D.Camera;

  private lookAheadX = 0;
  private nextLandingShakeAt = 0;
  private targetZoom = BASE_ZOOM;

  constructor(scene: Level1) {
    this.scene = scene;
    this.camera = scene.cameras.main;

    this.camera.setBounds(0, 0, LEVEL_WIDTH, LEVEL_HEIGHT);
    this.camera.startFollow(scene.player, true, 0.1, 0.1);
    this.camera.setDeadzone(DEADZONE_WIDTH, DEADZONE_HEIGHT);
    this.camera.setFollowOffset(0, 0);
    this.camera.setZoom(BASE_ZOOM);
  }

  update() {
    const delta = this.scene.game.loop.delta;
    const velocityX = this.scene.player.body.velocity.x;
    const targetLookAheadX =
      Math.abs(velocityX) > MIN_LOOK_AHEAD_SPEED
        ? Phaser.Math.Clamp(velocityX * 0.2, -MAX_LOOK_AHEAD_X, MAX_LOOK_AHEAD_X)
        : 0;
    const lerp = Math.min(1, delta * 0.008);

    this.lookAheadX = Phaser.Math.Linear(
      this.lookAheadX,
      targetLookAheadX,
      lerp,
    );
    this.camera.setFollowOffset(this.lookAheadX, 0);
    this.camera.setZoom(
      Phaser.Math.Linear(
        this.camera.zoom,
        this.targetZoom,
        Math.min(1, delta * 0.006),
      ),
    );
  }

  setDashZoomActive(active: boolean) {
    this.targetZoom = active ? DASH_ZOOM : BASE_ZOOM;
  }

  shakeOnLanding(impactSpeed: number) {
    if (impactSpeed < 80 || this.scene.time.now < this.nextLandingShakeAt) {
      return;
    }

    const normalizedImpact = Phaser.Math.Clamp((impactSpeed - 80) / 520, 0, 1);
    const duration = 90 + normalizedImpact * 40;
    const intensity = 0.0012 + normalizedImpact * 0.0016;

    this.camera.shake(duration, intensity, true);
    this.nextLandingShakeAt = this.scene.time.now + 120;
  }
}
