import Phaser from "phaser";

import type Level1 from "@/game/scenes/Level1";

const HUD_WIDTH = 420;
const HUD_HEIGHT = 52;
const HEART_SIZE = 18;
const HEART_SPACING = 28;
const HEARTS_START_X = 36;
const HEARTS_Y = 35;
const COMBO_HOLD_MS = 1400;
const COMBO_FADE_MS = 900;
const COMBO_X = 920;
const COMBO_Y = 34;

export function createHUD(scene: Level1) {
  const hudBg = scene.add.graphics();
  hudBg.fillStyle(0x0f172a, 0.8);
  hudBg.lineStyle(2, 0x38bdf8, 0.5);
  hudBg.fillRoundedRect(10, 10, HUD_WIDTH, HUD_HEIGHT, 8);
  hudBg.strokeRoundedRect(10, 10, HUD_WIDTH, HUD_HEIGHT, 8);
  hudBg.setScrollFactor(0);
  hudBg.setDepth(199);

  scene.hudHealthGraphics = scene.add.graphics().setScrollFactor(0).setDepth(200);
  scene.hudCoinIcon = scene.add
    .image(205, 35, "coin_icon")
    .setScrollFactor(0)
    .setDepth(200)
    .setDisplaySize(24, 24);
  scene.hudCoinText = scene.add
    .text(225, 23, "0", {
      fontSize: "18px",
      color: "#38bdf8",
      fontStyle: "bold",
      fontFamily: "monospace",
    })
    .setScrollFactor(0)
    .setDepth(200);
  scene.hudKeyIcon = scene.add
    .image(285, 35, "key_icon")
    .setScrollFactor(0)
    .setDepth(200)
    .setDisplaySize(24, 24);
  scene.hudKeyText = scene.add
    .text(305, 23, "KEY: NONE", {
      fontSize: "18px",
      color: "#38bdf8",
      fontStyle: "bold",
      fontFamily: "monospace",
    })
    .setScrollFactor(0)
    .setDepth(200);
  scene.hudComboGlowText = scene.add
    .text(COMBO_X, COMBO_Y, "", {
      fontSize: "30px",
      color: "#67e8f9",
      fontStyle: "bold",
      fontFamily: "monospace",
      stroke: "#082f49",
      strokeThickness: 10,
    })
    .setOrigin(1, 0.5)
    .setScrollFactor(0)
    .setDepth(201)
    .setAlpha(0);
  scene.hudComboText = scene.add
    .text(COMBO_X, COMBO_Y, "", {
      fontSize: "30px",
      color: "#f8fafc",
      fontStyle: "bold",
      fontFamily: "monospace",
      stroke: "#38bdf8",
      strokeThickness: 4,
    })
    .setOrigin(1, 0.5)
    .setScrollFactor(0)
    .setDepth(202)
    .setAlpha(0);

  updateHUD(scene);
  updateComboCounter(scene);
}

export function updateHUD(scene: Level1) {
  drawHearts(scene);
  scene.hudCoinText.setText(`${scene.coinsCollected}`);
  scene.hudKeyText.setText(`KEY: ${scene.hasKey ? "MASTER" : "NONE"}`);
  scene.hudKeyIcon.setAlpha(scene.hasKey ? 1 : 0.45);
}

function drawHearts(scene: Level1) {
  const graphics = scene.hudHealthGraphics;
  const health = scene.playerController.getHealth();
  const maxHealth = scene.playerController.getMaxHealth();

  graphics.clear();

  for (let index = 0; index < maxHealth; index += 1) {
    drawHeart(
      graphics,
      HEARTS_START_X + index * HEART_SPACING,
      HEARTS_Y,
      HEART_SIZE,
      index < health,
    );
  }
}

export function registerComboHit(scene: Level1, amount = 1) {
  scene.comboHits += amount;
  scene.comboVisibleUntil = scene.time.now + COMBO_HOLD_MS;
  scene.comboFadeStartedAt = scene.comboVisibleUntil;

  const nextTier = resolveComboTier(scene.comboHits);
  if (nextTier > scene.comboTier) {
    scene.comboTier = nextTier;
    pulseComboCounter(scene);
  } else if (nextTier !== 0) {
    scene.hudComboGlowText.setAlpha(1);
    scene.hudComboText.setAlpha(1);
  }

  updateComboCounter(scene);
}

export function clearComboCounter(scene: Level1) {
  scene.comboHits = 0;
  scene.comboTier = 0;
  scene.comboVisibleUntil = 0;
  scene.comboFadeStartedAt = 0;
  scene.hudComboGlowText.setText("").setAlpha(0).setScale(1);
  scene.hudComboText.setText("").setAlpha(0).setScale(1);
}

export function updateComboCounter(scene: Level1) {
  const tier = resolveComboTier(scene.comboHits);
  if (tier === 0) {
    scene.comboTier = 0;
    scene.hudComboGlowText.setText("").setAlpha(0);
    scene.hudComboText.setText("").setAlpha(0);
    return;
  }

  const text = `${tier} HIT`;
  scene.hudComboGlowText.setText(text);
  scene.hudComboText.setText(text);

  const now = scene.time.now;
  let alpha = 1;

  if (now > scene.comboVisibleUntil) {
    const fadeProgress = Phaser.Math.Clamp(
      (now - scene.comboVisibleUntil) / COMBO_FADE_MS,
      0,
      1,
    );
    alpha = 1 - fadeProgress;

    if (fadeProgress >= 1) {
      clearComboCounter(scene);
      return;
    }
  }

  scene.hudComboGlowText.setAlpha(alpha * 0.95);
  scene.hudComboText.setAlpha(alpha);
}

function resolveComboTier(comboHits: number) {
  if (comboHits >= 100) {
    return 100;
  }
  if (comboHits >= 50) {
    return 50;
  }
  if (comboHits >= 20) {
    return 20;
  }
  if (comboHits >= 10) {
    return 10;
  }
  if (comboHits >= 5) {
    return 5;
  }

  return 0;
}

function pulseComboCounter(scene: Level1) {
  scene.hudComboGlowText.setAlpha(1).setScale(0.86);
  scene.hudComboText.setAlpha(1).setScale(0.86);

  scene.tweens.add({
    targets: [scene.hudComboGlowText, scene.hudComboText],
    scaleX: 1.08,
    scaleY: 1.08,
    duration: 120,
    yoyo: true,
    ease: "Back.easeOut",
  });
}

function drawHeart(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  size: number,
  filled: boolean,
) {
  const topRadius = size * 0.3;
  const topY = y - size * 0.18;
  const bottomY = y + size * 0.55;
  const color = filled ? 0xfb7185 : 0x475569;
  const alpha = filled ? 1 : 0.22;

  graphics.fillStyle(color, alpha);
  graphics.lineStyle(2, color, filled ? 1 : 0.55);
  graphics.fillCircle(x - topRadius, topY, topRadius);
  graphics.fillCircle(x + topRadius, topY, topRadius);
  graphics.fillTriangle(
    x - size * 0.62,
    y - size * 0.02,
    x + size * 0.62,
    y - size * 0.02,
    x,
    bottomY,
  );
  graphics.strokeCircle(x - topRadius, topY, topRadius);
  graphics.strokeCircle(x + topRadius, topY, topRadius);
  graphics.lineBetween(x - size * 0.62, y - size * 0.02, x, bottomY);
  graphics.lineBetween(x + size * 0.62, y - size * 0.02, x, bottomY);
}
