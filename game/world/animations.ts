import type Phaser from "phaser";

export function createLevelAnimations(scene: Phaser.Scene) {
  if (!scene.anims.exists("basic_ninja_idle")) {
    scene.anims.create({
      key: "basic_ninja_idle",
      frames: [{ key: "basic_ninja_sheet", frame: 8 }],
    });
  }
  if (!scene.anims.exists("basic_ninja_walk")) {
    scene.anims.create({
      key: "basic_ninja_walk",
      frames: scene.anims.generateFrameNumbers("basic_ninja_sheet", {
        start: 0,
        end: 7,
      }),
      frameRate: 10,
      repeat: -1,
    });
  }
  if (!scene.anims.exists("basic_ninja_attack")) {
    scene.anims.create({
      key: "basic_ninja_attack",
      frames: scene.anims.generateFrameNumbers("basic_ninja_sheet", {
        start: 9,
        end: 11,
      }),
      frameRate: 14,
      repeat: 0,
    });
  }
  if (!scene.anims.exists("basic_ninja_hurt")) {
    scene.anims.create({
      key: "basic_ninja_hurt",
      frames: [{ key: "basic_ninja_sheet", frame: 12 }],
    });
  }
  if (!scene.anims.exists("enemy_walk")) {
    scene.anims.create({
      key: "enemy_walk",
      frames: scene.anims.generateFrameNumbers("enemy_sheet", {
        start: 0,
        end: 7,
      }),
      frameRate: 10,
      repeat: -1,
    });
  }
  if (!scene.anims.exists("burn")) {
    scene.anims.create({
      key: "burn",
      frames: scene.anims.generateFrameNumbers("flame_loop", {
        start: 0,
        end: 3,
      }),
      frameRate: 10,
      repeat: -1,
    });
  }
  if (!scene.anims.exists("coin_spin")) {
    scene.anims.create({
      key: "coin_spin",
      frames: scene.anims.generateFrameNumbers("coin_spin", {
        start: 0,
        end: 3,
      }),
      frameRate: 12,
      repeat: -1,
    });
  }
}
