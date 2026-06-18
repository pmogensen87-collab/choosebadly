import Phaser from "phaser";

import BasicNinja from "@/game/enemies/BasicNinja";
import type Enemy from "@/game/enemies/Enemy";
import type Level1 from "@/game/scenes/Level1";

export function createEnemies(scene: Level1) {
  scene.enemies = scene.physics.add.group();
  scene.enemyControllers = [
    new BasicNinja(scene, 500, 450),
    new BasicNinja(scene, 1500, 300),
  ];
}

export function registerEnemyEncounters(
  scene: Level1,
  platforms: Phaser.Physics.Arcade.StaticGroup,
) {
  scene.physics.add.collider(scene.enemies, platforms);
  scene.physics.add.collider(scene.enemies, scene.fallingPlatforms);
  scene.physics.add.overlap(scene.player, scene.enemies, (_player, enemyObject) => {
    const enemy = getEnemyController(
      enemyObject as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody,
    );
    enemy?.handlePlayerContact();
  });
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
) {
  const enemy = getEnemyController(enemySprite);
  if (!enemy) {
    return false;
  }

  const knockbackDirection = resolveEnemyKnockbackDirection(scene, enemySprite);
  return enemy.takeDamage(amount, knockbackDirection);
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
