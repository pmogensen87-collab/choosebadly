import type Phaser from "phaser";

import {
  CAMERA_HEIGHT,
  CAMERA_WIDTH,
} from "@/game/managers/level1Types";

export type PhaserModule = typeof import("phaser");
export type SceneClass = new () => Phaser.Scene;

export function createGameConfig(
  phaser: PhaserModule,
  parent: HTMLElement,
  scene: SceneClass,
): Phaser.Types.Core.GameConfig {
  return {
    type: phaser.AUTO,
    width: CAMERA_WIDTH,
    height: CAMERA_HEIGHT,
    parent,
    backgroundColor: "#0f172a",
    scale: {
      mode: phaser.Scale.FIT,
      autoCenter: phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: "arcade",
      arcade: {
        gravity: { x: 0, y: 1200 },
        debug: false,
      },
    },
    scene,
  };
}
