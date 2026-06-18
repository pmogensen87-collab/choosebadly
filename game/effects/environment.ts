import type Phaser from "phaser";

import type Level1 from "@/game/scenes/Level1";

export function createLevelBackground(scene: Phaser.Scene) {
  const bgGraphics = scene.add.graphics();
  bgGraphics.fillStyle(0x1e293b, 0.3);
  for (let i = 0; i < 15; i += 1) {
    const height = 200 + Math.random() * 400;
    const width = 100 + Math.random() * 150;
    const buildingX = i * 250;
    const buildingY = 540 - height;
    bgGraphics.fillRect(buildingX, buildingY, width, height);
    bgGraphics.lineStyle(1, 0x334155, 0.2);
    bgGraphics.strokeRect(buildingX, buildingY, width, height);

    for (let j = 0; j < 5; j += 1) {
      const windowX = buildingX + 10 + Math.random() * (width - 20);
      const windowY = buildingY + 10 + Math.random() * (height - 20);
      const windowLight = scene.add.rectangle(windowX, windowY, 4, 6, 0x38bdf8, 0.2);
      windowLight.setScrollFactor(0.2);
      scene.tweens.add({
        targets: windowLight,
        alpha: 0.8,
        duration: 500 + Math.random() * 2000,
        yoyo: true,
        repeat: -1,
        delay: Math.random() * 2000,
      });
    }
  }
  bgGraphics.setScrollFactor(0.2);

  for (let i = 0; i < 3; i += 1) {
    const ship = scene.add.rectangle(
      Math.random() * 2200,
      50 + Math.random() * 150,
      60,
      20,
      0x0f172a,
    );
    ship.setStrokeStyle(1, 0x38bdf8, 0.3);
    ship.setScrollFactor(0.1);
    scene.tweens.add({
      targets: ship,
      x: "+=2200",
      duration: 40000 + Math.random() * 20000,
      repeat: -1,
    });
  }

  const grid = scene.add.graphics();
  grid.lineStyle(1, 0x1e293b, 0.5);
  for (let x = 0; x < 2200; x += 40) {
    grid.lineBetween(x, 0, x, 540);
  }
  for (let y = 0; y < 540; y += 40) {
    grid.lineBetween(0, y, 2200, y);
  }
}

export function createLandingDust(scene: Phaser.Scene) {
  return scene.add.particles(0, 0, "dust_dot", {
    scale: { start: 0.1, end: 0 },
    alpha: { start: 0.3, end: 0 },
    lifespan: 400,
    speed: { min: 20, max: 60 },
    gravityY: -50,
    emitting: false,
  });
}

export function createLighting(scene: Level1) {
  scene.lightOverlay = scene.add.renderTexture(0, 0, 960, 540).setScrollFactor(0);
  scene.lightOverlay.setAlpha(0.85);
  scene.lightOverlay.setDepth(100);
  scene.softLight = scene.add.image(0, 0, "soft_light").setVisible(false);
}

export function updateLighting(scene: Level1) {
  if (!scene.lightOverlay || !scene.softLight) {
    return;
  }

  scene.lightOverlay.clear();
  scene.lightOverlay.fill(0x000000, 1);
  const lightX = scene.player.x - scene.cameras.main.scrollX;
  const lightY = scene.player.y - scene.cameras.main.scrollY;
  scene.lightOverlay.erase(scene.softLight, lightX, lightY);
}

export function createRain(scene: Level1) {
  scene.rainParticles = scene.add.particles(0, 0, "rain_drop", {
    x: { min: 0, max: 2200 },
    y: -10,
    lifespan: 1500,
    speedY: { min: 600, max: 900 },
    scaleY: { min: 1, max: 2 },
    alpha: { start: 0.4, end: 0.1 },
    quantity: 3,
    blendMode: "ADD",
  });
}
