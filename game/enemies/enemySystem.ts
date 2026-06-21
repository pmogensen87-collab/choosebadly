import Phaser from "phaser";

import BasicNinja from "@/game/enemies/BasicNinja";
import ChaserEnemy from "@/game/enemies/ChaserEnemy";
import type Enemy from "@/game/enemies/Enemy";
import type Level1 from "@/game/scenes/Level1";

type EnemySpawn = {
  x: number;
  y: number;
};

const SECTION_1_BASIC_SPAWNS: EnemySpawn[] = [
  { x: 240, y: 450 },
  { x: 520, y: 450 },
];

const SECTION_2_BASIC_SPAWNS: EnemySpawn[] = [
  { x: 1220, y: 450 },
  { x: 1480, y: 320 },
  { x: 1720, y: 450 },
  { x: 1880, y: 310 },
];

const SECTION_3_BASIC_SPAWNS: EnemySpawn[] = [
  { x: 2260, y: 450 },
  { x: 2440, y: 450 },
  { x: 2580, y: 310 },
  { x: 2740, y: 450 },
  { x: 2920, y: 310 },
  { x: 3040, y: 450 },
];

const SECTION_3_ELITE_SPAWN: EnemySpawn = { x: 2820, y: 390 };

export function createEnemies(scene: Level1) {
  scene.enemies = scene.physics.add.group();
  scene.enemyControllers = [];

  const createBasicNinja = ({ x, y }: EnemySpawn) => {
    scene.enemyControllers.push(new BasicNinja(scene, x, y));
  };

  SECTION_1_BASIC_SPAWNS.forEach(createBasicNinja);
  SECTION_2_BASIC_SPAWNS.forEach(createBasicNinja);
  SECTION_3_BASIC_SPAWNS.forEach(createBasicNinja);
  scene.enemyControllers.push(
    new ChaserEnemy(scene, SECTION_3_ELITE_SPAWN.x, SECTION_3_ELITE_SPAWN.y),
  );
}

export function registerEnemyEncounters(
  scene: Level1,
  platforms: Phaser.Physics.Arcade.StaticGroup,
) {
  scene.physics.add.collider(scene.enemies, platforms);
}

export function updateEnemies(scene: Level1) {
  scene.enemyControllers = scene.enemyControllers.filter((enemy) => !enemy.isDead());
  scene.enemyControllers.forEach((enemy) => {
    enemy.update();
  });
}

export function damageEnemy(
  scene: Level1,
  enemySprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody,
  amount = 1,
  knockbackX = 150,
  knockbackY = -120,
) {
  const enemy = getEnemyController(enemySprite);
  if (!enemy) {
    return false;
  }

  const knockbackDirection = resolveEnemyKnockbackDirection(scene, enemySprite);
  return enemy.takeDamage(amount, knockbackDirection, knockbackX, knockbackY);
}

export function killEnemy(
  scene: Level1,
  enemySprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody,
) {
  const enemy = getEnemyController(enemySprite);
  if (!enemy) {
    return;
  }

  const knockbackDirection = resolveEnemyKnockbackDirection(scene, enemySprite);
  enemy.kill(knockbackDirection);
}

function getEnemyController(
  enemySprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody,
) {
  if (!enemySprite.active) {
    return null;
  }

  return (enemySprite.getData("enemyController") as Enemy | undefined) ?? null;
}

function resolveEnemyKnockbackDirection(
  scene: Level1,
  enemySprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody,
) {
  const deltaX = enemySprite.x - scene.player.x;
  if (Math.abs(deltaX) > 4) {
    return Math.sign(deltaX);
  }

  return scene.player.flipX ? -1 : 1;
}
