import Hitbox, { type HitboxConfig } from "@/game/weapons/hitbox";
import type { WeaponTrail } from "@/game/weapons/types";

export type AttackDataConfig = {
  id: string;
  poseKey: string;
  damage: number;
  knockbackX: number;
  knockbackY: number;
  durationMs: number;
  activeStartMs: number;
  activeEndMs: number;
  queueOpenMs: number;
  comboResetMs: number;
  cooldownMs: number;
  hitbox: HitboxConfig;
  trail: WeaponTrail;
};

export default class AttackData {
  readonly id: string;
  readonly poseKey: string;
  readonly damage: number;
  readonly knockbackX: number;
  readonly knockbackY: number;
  readonly durationMs: number;
  readonly activeStartMs: number;
  readonly activeEndMs: number;
  readonly queueOpenMs: number;
  readonly comboResetMs: number;
  readonly cooldownMs: number;
  readonly hitbox: Hitbox;
  readonly trail: WeaponTrail;

  constructor(config: AttackDataConfig) {
    this.id = config.id;
    this.poseKey = config.poseKey;
    this.damage = config.damage;
    this.knockbackX = config.knockbackX;
    this.knockbackY = config.knockbackY;
    this.durationMs = config.durationMs;
    this.activeStartMs = config.activeStartMs;
    this.activeEndMs = config.activeEndMs;
    this.queueOpenMs = config.queueOpenMs;
    this.comboResetMs = config.comboResetMs;
    this.cooldownMs = config.cooldownMs;
    this.hitbox = new Hitbox(config.hitbox);
    this.trail = config.trail;
  }
}
