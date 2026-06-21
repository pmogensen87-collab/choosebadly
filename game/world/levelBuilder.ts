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

type LedgeSpec = {
  x: number;
  y: number;
  width: number;
  mantleX: number;
  mantleY: number;
};

export function buildLevelWorld(scene: Level1): LevelWorld {
  const platforms = scene.physics.add.staticGroup();
  const hazards = scene.physics.add.staticGroup();
  scene.ladders = scene.physics.add.staticGroup();
  scene.ropes = scene.physics.add.staticGroup();
  scene.oneWayPlatforms = scene.physics.add.staticGroup();
  scene.ledges = scene.physics.add.staticGroup();

  const createStyledPlatform = (
    x: number,
    y: number,
    width: number,
    height: number,
    fillColor = 0x1e293b,
  ) => {
    scene.add.rectangle(x, y, width + 6, height + 6, 0x38bdf8, 0.08);
    scene.add.rectangle(x, y, width + 2, height + 2, 0x38bdf8, 0.16);
    const platform = scene.add.rectangle(x, y, width, height, fillColor);
    platform.setStrokeStyle(2, 0x38bdf8);
    platforms.add(platform);
    return platform;
  };

  const createOneWayPlatform = (
    x: number,
    y: number,
    width: number,
    height: number,
  ) => {
    const platform = scene.add.rectangle(x, y, width, height, 0x0f172a, 0.88);
    platform.setStrokeStyle(2, 0x67e8f9, 0.9);
    scene.add.rectangle(x, y, width + 10, height + 10, 0x38bdf8, 0.05);
    scene.oneWayPlatforms.add(platform);
    return platform;
  };

  const createLadder = (x: number, y: number, height: number) => {
    const ladderVisual = scene.add.image(x, y, "ladder");
    ladderVisual.setDisplaySize(42, height);
    ladderVisual.setAlpha(0.95);

    const ladderSensor = scene.add.rectangle(x, y, 42, height, 0xffffff, 0.01);
    scene.ladders.add(ladderSensor);
    return ladderVisual;
  };

  const createRope = (x: number, y: number, length: number) => {
    const rope = scene.add.rectangle(x, y, 8, length, 0xe2e8f0, 0.42);
    rope.setStrokeStyle(1, 0x94a3b8, 0.4);
    rope.setDataEnabled();
    rope.setData("anchorX", x);
    rope.setData("anchorY", y - length * 0.5);
    rope.setData("length", length * 0.5);
    scene.ropes.add(rope);
    return rope;
  };

  const createLedge = (spec: LedgeSpec) => {
    const ledge = scene.add.rectangle(spec.x, spec.y, spec.width, 18, 0xffffff, 0.02);
    ledge.setStrokeStyle(1, 0x67e8f9, 0.18);
    ledge.setDataEnabled();
    ledge.setData("mantleX", spec.mantleX);
    ledge.setData("mantleY", spec.mantleY);
    scene.ledges.add(ledge);
    return ledge;
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

  createStyledPlatform(LEVEL_WIDTH / 2, 520, LEVEL_WIDTH, 40, 0x111827);

  // Section 1: tutorial fight with clear vertical routing.
  createStyledPlatform(240, 430, 240, 28);
  createStyledPlatform(520, 370, 220, 28);
  createOneWayPlatform(380, 315, 150, 16);
  createOneWayPlatform(590, 280, 140, 16);
  createLadder(120, 372, 176);
  createRope(760, 208, 156);
  createLedge({ x: 472, y: 350, width: 48, mantleX: 520, mantleY: 340 });
  createLedge({ x: 650, y: 260, width: 48, mantleX: 590, mantleY: 250 });

  // Section 2: platform combat with upper routes.
  createStyledPlatform(1220, 430, 300, 28);
  createStyledPlatform(1440, 350, 220, 28);
  createStyledPlatform(1730, 290, 220, 28);
  createOneWayPlatform(1360, 255, 180, 16);
  createOneWayPlatform(1650, 215, 170, 16);
  createLadder(1110, 370, 184);
  createRope(1600, 170, 150);
  createLedge({ x: 1450, y: 332, width: 48, mantleX: 1440, mantleY: 320 });
  createLedge({ x: 1842, y: 272, width: 48, mantleX: 1730, mantleY: 260 });

  // Section 3: larger arena with rooftops and elevated pressure.
  createStyledPlatform(2460, 430, 360, 28);
  createStyledPlatform(2730, 350, 260, 28);
  createStyledPlatform(2970, 285, 180, 28);
  createOneWayPlatform(2590, 305, 150, 16);
  createOneWayPlatform(2850, 240, 140, 16);
  createLadder(2350, 372, 184);
  createRope(2890, 170, 156);
  createLedge({ x: 2730, y: 332, width: 48, mantleX: 2730, mantleY: 320 });
  createLedge({ x: 3050, y: 267, width: 48, mantleX: 2970, mantleY: 255 });

  createSimpleHazard(940, 486);
  createSimpleHazard(2060, 486);
  createSimpleHazard(2870, 486);

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
