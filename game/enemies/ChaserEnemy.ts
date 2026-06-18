import Enemy from "@/game/enemies/Enemy";
import type Level1 from "@/game/scenes/Level1";

const AGGRO_RANGE = 400;
const MOVE_SPEED = 120;
const JUMP_SPEED = -450;
const JUMP_VERTICAL_THRESHOLD = 100;
const JUMP_HORIZONTAL_RANGE = 100;

export default class ChaserEnemy extends Enemy {
  constructor(scene: Level1, x: number, y: number) {
    super(scene, {
      x,
      y,
      texture: "enemy_sheet",
      bodyWidth: 24,
      bodyHeight: 48,
      animationKey: "enemy_walk",
    });
  }

  update() {
    if (this.isDead()) {
      return;
    }

    if (this.distanceToPlayer() >= AGGRO_RANGE) {
      this.stopHorizontalMovement();
      return;
    }

    this.moveTowardPlayer(MOVE_SPEED);

    if (this.shouldJumpTowardPlayer(
      JUMP_VERTICAL_THRESHOLD,
      JUMP_HORIZONTAL_RANGE,
    )) {
      this.sprite.setVelocityY(JUMP_SPEED);
    }
  }
}
