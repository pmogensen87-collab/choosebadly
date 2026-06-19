import type AttackData from "@/game/weapons/attackData";
import type { WeaponId } from "@/game/weapons/types";

export interface Weapon {
  readonly id: WeaponId;
  readonly attacks: readonly AttackData[];
  getAttack(index: number): AttackData;
}
