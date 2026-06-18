import type Level1 from "@/game/scenes/Level1";

export function performAttack(scene: Level1) {
  scene.weaponSystem.triggerPrimaryAttack();
}
