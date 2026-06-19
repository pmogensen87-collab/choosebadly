import type Phaser from "phaser";

import type AttackData from "@/game/weapons/attackData";
import type { Weapon } from "@/game/weapons/weapon";

export type WeaponId = "katana";

export type WeaponAttackId =
  | "katana_slash_1"
  | "katana_slash_2"
  | "katana_slash_3";

export type AttackableBody =
  | Phaser.Physics.Arcade.Body
  | Phaser.Physics.Arcade.StaticBody;

export type AttackableTarget = Phaser.GameObjects.GameObject & {
  active: boolean;
  body: AttackableBody;
  x: number;
  y: number;
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

export type AttackStartEvent = {
  weapon: Weapon;
  attack: AttackData;
  attackIndex: number;
  startedAt: number;
};

export type AttackHitEvent = {
  weapon: Weapon;
  attack: AttackData;
  attackIndex: number;
  target: AttackableTarget;
  damage: number;
  knockbackDirection: number;
};

export type AttackFinishedEvent = {
  weapon: Weapon;
  attack: AttackData;
  attackIndex: number;
  finishedAt: number;
  cancelled: boolean;
};
