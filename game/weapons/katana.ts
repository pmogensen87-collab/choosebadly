import type { WeaponAttackDefinition, WeaponId } from "@/game/weapons/types";

export const KATANA_ID: WeaponId = "katana";

export const KATANA_COMBO: WeaponAttackDefinition[] = [
  {
    id: "katana_slash_1",
    durationMs: 180,
    activeStartMs: 46,
    activeEndMs: 110,
    queueOpenMs: 92,
    comboWindowMs: 260,
    hitbox: {
      offsetX: 34,
      offsetY: -10,
      width: 66,
      height: 44,
    },
    trail: {
      offsetX: 8,
      offsetY: -4,
      radius: 40,
      startAngle: -2.3,
      endAngle: 0.2,
      fadeMs: 150,
      strokeColor: 0x67e8f9,
      coreColor: 0xffffff,
    },
  },
  {
    id: "katana_slash_2",
    durationMs: 210,
    activeStartMs: 62,
    activeEndMs: 132,
    queueOpenMs: 112,
    comboWindowMs: 280,
    hitbox: {
      offsetX: 38,
      offsetY: -2,
      width: 72,
      height: 52,
    },
    trail: {
      offsetX: 10,
      offsetY: -2,
      radius: 42,
      startAngle: 1.95,
      endAngle: -0.42,
      fadeMs: 170,
      strokeColor: 0x38bdf8,
      coreColor: 0xe0f2fe,
    },
  },
  {
    id: "katana_slash_3",
    durationMs: 260,
    activeStartMs: 86,
    activeEndMs: 170,
    queueOpenMs: 140,
    comboWindowMs: 330,
    hitbox: {
      offsetX: 44,
      offsetY: -12,
      width: 82,
      height: 58,
    },
    trail: {
      offsetX: 8,
      offsetY: -8,
      radius: 50,
      startAngle: -1.72,
      endAngle: 0.88,
      fadeMs: 210,
      strokeColor: 0x22d3ee,
      coreColor: 0xf8fafc,
    },
  },
];
