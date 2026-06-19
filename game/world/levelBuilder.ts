import Phaser from "phaser";

import {
  LEVEL_WIDTH,
  MID_TUBE_EXIT_X,
  MID_TUBE_EXIT_Y,
} from "@/game/managers/level1Types";
import type Level1 from "@/game/scenes/Level1";

export type LevelWorld = {
  platforms: Phaser.Physics.Arcade.StaticGroup;
  hazards: Phaser.Physics.Arcade.StaticGroup;
};

export function buildLevelWorld(scene: Level1): LevelWorld {
  const platforms = scene.physics.add.staticGroup();

  const createStyledPlatform = (
    x: number,
    y: number,
    width: number,
    height: number,
  ) => {
    scene.add.rectangle(x, y, width + 4, height + 4, 0x38bdf8, 0.1);
    scene.add.rectangle(x, y, width + 2, height + 2, 0x38bdf8, 0.2);
    const platform = scene.add.rectangle(x, y, width, height, 0x1e293b);
    platform.setStrokeStyle(2, 0x38bdf8);
    platforms.add(platform);
  };

  const createSimpleHazard = (x: number, y: number) => {
    const spike = hazards.create(
      x,
      y,
      "spike_fire",
    ) as Phaser.Types.Physics.Arcade.SpriteWithStaticBody;
    spike.setDisplaySize(36, 36);
    spike.refreshBody();
    if (spike.body) {
      spike.body.setSize(20, 20);
    }
    return spike;
  };

  createStyledPlatform(LEVEL_WIDTH / 2, 520, LEVEL_WIDTH, 40);

  // Section 1: tutorial fight.
  createStyledPlatform(300, 430, 260, 28);
  createStyledPlatform(620, 365, 220, 28);

  // Section 2: platform fight with vertical routing.
  createStyledPlatform(1280, 430, 280, 28);
  createStyledPlatform(1580, 335, 240, 28);
  createStyledPlatform(1880, 400, 220, 28);

  // Section 3: larger arena.
  createStyledPlatform(2460, 430, 320, 28);
  createStyledPlatform(2840, 355, 260, 28);
  createStyledPlatform(2660, 285, 180, 28);

  scene.fallingPlatforms = scene.physics.add.group();

  const hazards = scene.physics.add.staticGroup();
  createSimpleHazard(860, 486);
  createSimpleHazard(1720, 486);
  createSimpleHazard(2580, 486);

  scene.hiddenHazards = scene.add.group();

  scene.weaponTargets = scene.physics.add.staticGroup();
  scene.coins = scene.physics.add.staticGroup();
  scene.keyItems = scene.physics.add.staticGroup();
  scene.lockedGates = scene.physics.add.staticGroup();

  scene.tubes = scene.physics.add.staticGroup();
  scene.tubes.create(300, 500, "tube");
  scene.tubes.create(LEVEL_WIDTH - 120, 500, "tube");

  return { platforms, hazards };
}

export function wireWorldInteractions(
  scene: Level1,
  hazards: Phaser.Physics.Arcade.StaticGroup,
) {
  scene.physics.add.overlap(scene.player, hazards, (_player, hazard) => {
    if (scene.playerController.isInvincible()) {
      return;
    }

    const sourceHazard = hazard as Phaser.GameObjects.Sprite;
    scene.damagePlayer(sourceHazard.x, sourceHazard.y);
  });
  scene.physics.add.overlap(scene.player, scene.ladders, () => {
    scene.isClimbing = true;
  });
  scene.physics.add.overlap(scene.player, scene.coins, (_player, coin) => {
    coin.destroy();
    scene.coinsCollected += 1;
    scene.updateHUD();
    scene.playSFX("coin");
    scene.cameras.main.shake(50, 0.002);
  });
  scene.physics.add.overlap(scene.player, scene.keyItems, (_player, keyItem) => {
    keyItem.destroy();
    scene.hasKey = true;
    scene.playSFX("key");
    scene.updateHUD();
  });
  scene.physics.add.collider(scene.player, scene.lockedGates, (_player, gate) => {
    if (scene.hasKey) {
      gate.destroy();
      scene.hasKey = false;
      scene.playSFX("death");
      scene.updateHUD();
    } else {
      scene.cameras.main.shake(100, 0.005);
    }
  });
}

export function revealHiddenHazards(scene: Level1) {
  scene.hiddenHazards.getChildren().forEach((hazardObject) => {
    const hazard = hazardObject as Phaser.GameObjects.Sprite;
    const dist = Phaser.Math.Distance.Between(
      scene.player.x,
      scene.player.y,
      hazard.x,
      hazard.y,
    );
    if (dist < 100) {
      hazard.setVisible(true);
    }
  });
}

export function handleTubeInteraction(scene: Level1) {
  scene.physics.overlap(scene.player, scene.tubes, (_player, tubeObject) => {
    const tube = tubeObject as Phaser.GameObjects.Sprite;
    if (tube.x > LEVEL_WIDTH - 200) {
      scene.scene.restart({ skipIntroFade: true });
    } else if (tube.x < 500) {
      scene.player.setPosition(MID_TUBE_EXIT_X, MID_TUBE_EXIT_Y);
    }
  });
}
