import type Phaser from "phaser";

export type WeaponId = "katana";

export type WeaponAttackId =
  | "katana_slash_1"
  | "katana_slash_2"
  | "katana_slash_3";

export type WeaponHitbox = {
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
};

export type WeaponTrail = {
  offsetX: number;
  offsetY: number;
  radius: number;
  startAngle: number;
  endAngle: number;
  fadeMs: number;
  strokeColor: number;
  coreColor: number;
};

export type WeaponAttackDefinition = {
  id: WeaponAttackId;
  durationMs: number;
  activeStartMs: number;
  activeEndMs: number;
  queueOpenMs: number;
  comboWindowMs: number;
  hitbox: WeaponHitbox;
  trail: WeaponTrail;
};

export type AttackableBody =
  | Phaser.Physics.Arcade.Body
  | Phaser.Physics.Arcade.StaticBody;

export type AttackableTarget = Phaser.GameObjects.GameObject & {
  active: boolean;
  body: AttackableBody;
  x: number;
  y: number;
};
