import Phaser from "phaser";

import {
  MID_TUBE_EXIT_X,
  MID_TUBE_EXIT_Y,
} from "@/game/managers/level1Types";
import type { FallingPlatform } from "@/game/managers/level1Types";
import type Level1 from "@/game/scenes/Level1";

export type LevelWorld = {
  platforms: Phaser.Physics.Arcade.StaticGroup;
  hazards: Phaser.Physics.Arcade.StaticGroup;
};

export function buildLevelWorld(scene: Level1): LevelWorld {
  const platforms = scene.physics.add.staticGroup();
  const createStyledPlatform = (x: number, y: number, width: number, height: number) => {
    scene.add.rectangle(x, y, width + 4, height + 4, 0x38bdf8, 0.1);
    scene.add.rectangle(x, y, width + 2, height + 2, 0x38bdf8, 0.2);
    const platform = scene.add.rectangle(x, y, width, height, 0x1e293b);
    platform.setStrokeStyle(2, 0x38bdf8);
    platforms.add(platform);
  };

  createStyledPlatform(450, 520, 900, 40);
  createStyledPlatform(1200, 520, 400, 40);
  createStyledPlatform(1800, 520, 800, 40);
  createStyledPlatform(800, 300, 300, 30);
  createStyledPlatform(1300, 250, 300, 30);

  scene.fallingPlatforms = scene.physics.add.group();
  const createSplittingPlatform = (x: number, y: number, width: number, height: number) => {
    const halfWidth = width / 2;
    const leftPlatform = scene.add.rectangle(
      x - halfWidth / 2,
      y,
      halfWidth - 2,
      height,
      0x1e293b,
    ) as FallingPlatform;
    const rightPlatform = scene.add.rectangle(
      x + halfWidth / 2,
      y,
      halfWidth - 2,
      height,
      0x1e293b,
    ) as FallingPlatform;

    leftPlatform.setStrokeStyle(2, 0x38bdf8);
    rightPlatform.setStrokeStyle(2, 0x38bdf8);
    scene.fallingPlatforms.add(leftPlatform);
    scene.fallingPlatforms.add(rightPlatform);

    [leftPlatform, rightPlatform].forEach((platform) => {
      platform.body.setImmovable(true);
      platform.body.allowGravity = false;
      platform.isFalling = false;
    });
  };

  createSplittingPlatform(1050, 440, 200, 30);
  createSplittingPlatform(1550, 400, 200, 30);

  scene.ladders = scene.physics.add.staticGroup();
  const createLadder = (x: number, y: number, height: number) => {
    for (let i = 0; i < height; i += 1) {
      scene.ladders.create(x, y - i * 40, "ladder");
    }
  };
  createLadder(600, 500, 6);
  createLadder(1100, 500, 7);

  scene.tubes = scene.physics.add.staticGroup();
  scene.tubes.create(2100, 500, "tube");
  scene.tubes.create(300, 500, "tube");

  const hazards = scene.physics.add.staticGroup();
  const createFlameHazard = (x: number, y: number) => {
    const flame = hazards.create(
      x,
      y,
      "flame_loop",
      0,
    ) as Phaser.Types.Physics.Arcade.SpriteWithStaticBody;
    flame.setDisplaySize(36, 36);
    flame.refreshBody();
    flame.play("burn");
    if (flame.body) {
      flame.body.setSize(20, 20);
    }
    return flame;
  };

  createFlameHazard(850, 485);
  createFlameHazard(1400, 485);

  const createSpikeHazard = (x: number, y: number) => {
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

  scene.hiddenHazards = scene.add.group();
  const hiddenSpike = createSpikeHazard(1050, 405);
  hiddenSpike.setVisible(false);

  const hint = scene.add.rectangle(980, 410, 4, 4, 0xffaa00, 0.3);
  scene.tweens.add({
    targets: hint,
    alpha: 0.1,
    duration: 500,
    yoyo: true,
    repeat: -1,
  });
  scene.hiddenHazards.add(hiddenSpike);

  scene.weaponTargets = scene.physics.add.staticGroup();
  [
    { x: 720, y: 248 },
    { x: 1225, y: 466 },
    { x: 1700, y: 466 },
  ].forEach(({ x, y }) => {
    const target = scene.weaponTargets.create(
      x,
      y,
      "training_dummy",
    ) as Phaser.Types.Physics.Arcade.SpriteWithStaticBody;
    target.setDisplaySize(28, 74);
    target.refreshBody();
  });

  scene.coins = scene.physics.add.staticGroup();
  [500, 700, 1200, 1400, 1800].forEach((x) => {
    const coin = scene.coins.create(
      x,
      480,
      "coin_spin",
      0,
    ) as Phaser.Types.Physics.Arcade.SpriteWithStaticBody;
    coin.setDisplaySize(20, 20);
    coin.refreshBody();
    coin.play("coin_spin");
    scene.tweens.add({
      targets: coin,
      y: coin.y - 10,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  });

  scene.keyItems = scene.physics.add.staticGroup();
  const keyItem = scene.keyItems.create(
    1300,
    200,
    "key_blue",
  ) as Phaser.Types.Physics.Arcade.SpriteWithStaticBody;
  keyItem.setDisplaySize(24, 24);
  keyItem.refreshBody();
  if (keyItem.body) {
    keyItem.body.setSize(18, 18);
  }

  scene.lockedGates = scene.physics.add.staticGroup();
  const gate = scene.add.rectangle(1900, 400, 20, 150, 0x38bdf8, 0.3);
  gate.setStrokeStyle(2, 0x38bdf8);
  scene.lockedGates.add(gate);

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
    if (tube.x > 2000) {
      scene.scene.restart({ skipIntroFade: true });
    } else if (tube.x < 500) {
      scene.player.setPosition(MID_TUBE_EXIT_X, MID_TUBE_EXIT_Y);
    }
  });
}
