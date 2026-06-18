import type Phaser from "phaser";

export const CAMERA_WIDTH = 960;
export const CAMERA_HEIGHT = 540;
export const LEVEL_WIDTH = 2200;
export const LEVEL_HEIGHT = 540;
export const MID_TUBE_EXIT_X = 1200;
export const MID_TUBE_EXIT_Y = 450;

export type MovementKeys = {
  A: Phaser.Input.Keyboard.Key;
  D: Phaser.Input.Keyboard.Key;
  W: Phaser.Input.Keyboard.Key;
  S: Phaser.Input.Keyboard.Key;
  SHIFT: Phaser.Input.Keyboard.Key;
};

export type SFXType = "jump" | "slash" | "parry" | "punch" | "coin" | "key" | "death";

export type FallingPlatform = Phaser.GameObjects.Rectangle & {
  body: Phaser.Physics.Arcade.Body;
  isFalling: boolean;
};

export type Level1SceneData = {
  skipIntroFade?: boolean;
};
