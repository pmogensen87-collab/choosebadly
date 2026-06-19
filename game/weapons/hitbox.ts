import Phaser from "phaser";

export type HitboxConfig = {
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
};

export default class Hitbox {
  readonly offsetX: number;
  readonly offsetY: number;
  readonly width: number;
  readonly height: number;

  constructor(config: HitboxConfig) {
    this.offsetX = config.offsetX;
    this.offsetY = config.offsetY;
    this.width = config.width;
    this.height = config.height;
  }

  toRectangle(originX: number, originY: number, direction = 1) {
    const centerX = originX + this.offsetX * direction;
    const centerY = originY + this.offsetY;

    return new Phaser.Geom.Rectangle(
      centerX - this.width / 2,
      centerY - this.height / 2,
      this.width,
      this.height,
    );
  }

  intersects(
    originX: number,
    originY: number,
    direction: number,
    body: Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody,
  ) {
    const hitbox = this.toRectangle(originX, originY, direction);
    const targetBounds = new Phaser.Geom.Rectangle(
      body.x,
      body.y,
      body.width,
      body.height,
    );

    return Phaser.Geom.Intersects.RectangleToRectangle(hitbox, targetBounds);
  }
}
