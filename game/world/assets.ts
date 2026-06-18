import type Phaser from "phaser";

export function preloadLevelAssets(scene: Phaser.Scene) {
  if (!scene.textures.exists("coin_spin")) {
    scene.load.spritesheet("coin_spin", "/assets/coins/coin_spin.png", {
      frameWidth: 32,
      frameHeight: 32,
    });
  }
  if (!scene.textures.exists("flame_loop")) {
    scene.load.spritesheet("flame_loop", "/assets/traps/flame_loop.png", {
      frameWidth: 48,
      frameHeight: 48,
    });
  }
  if (!scene.textures.exists("spike_fire")) {
    scene.load.image("spike_fire", "/assets/traps/spike_fire.png");
  }
  if (!scene.textures.exists("key_blue")) {
    scene.load.image("key_blue", "/assets/keys/key_blue.png");
  }
  if (!scene.textures.exists("coin_icon")) {
    scene.load.image("coin_icon", "/assets/ui/coin_icon.png");
  }
  if (!scene.textures.exists("key_icon")) {
    scene.load.image("key_icon", "/assets/ui/key_icon.png");
  }
  if (!scene.cache.audio.exists("bg_music")) {
    scene.load.audio("bg_music", "/assets/audio/bg_music.mp3");
  }
  if (!scene.cache.audio.exists("coin_pickup")) {
    scene.load.audio("coin_pickup", "/assets/audio/coin_pickup.wav");
  }
  if (!scene.cache.audio.exists("arcade_punch")) {
    scene.load.audio("arcade_punch", "/assets/audio/arcade_punch.wav");
  }
  if (!scene.cache.audio.exists("key_pickup")) {
    scene.load.audio("key_pickup", "/assets/audio/key_pling.wav");
  }

  const graphics = scene.add.graphics();
  graphics.setVisible(false);

  const drawStickmanFrame = (
    offsetX: number,
    walkStep: number,
    color = 0xffffff,
    hasHat = true,
  ) => {
    if (hasHat) {
      graphics.lineStyle(1.5, 0xffffff, 1);
      graphics.strokeRect(offsetX + 2, 8, 20, 2);
      graphics.strokeRect(offsetX + 6, 3, 12, 5);
      graphics.fillStyle(0x000000);
      graphics.fillRect(offsetX + 2, 8, 20, 2);
      graphics.fillRect(offsetX + 6, 3, 12, 5);
      graphics.fillStyle(0x38bdf8);
      graphics.fillRect(offsetX + 8, 12, 8, 2);
    }

    graphics.lineStyle(2.5, color);
    graphics.strokeCircle(offsetX + 12, 12, 7);
    graphics.lineBetween(offsetX + 12, 19, offsetX + 12, 35);

    const legSwing = Math.sin(walkStep) * 14;
    const armSwing = Math.cos(walkStep) * 12;
    graphics.lineBetween(offsetX + 12, 22, offsetX + 12 - armSwing, 32);
    graphics.lineBetween(offsetX + 12, 22, offsetX + 12 + armSwing, 32);
    graphics.lineBetween(offsetX + 12, 35, offsetX + 12 + legSwing, 48);
    graphics.lineBetween(offsetX + 12, 35, offsetX + 12 - legSwing, 48);
  };

  const drawBasicNinjaFrame = (
    offsetX: number,
    pose: "walk" | "idle" | "attack_windup" | "attack_slash" | "attack_recover" | "hurt",
    walkStep = 0,
  ) => {
    const hoodColor = 0x020617;
    const clothColor = 0x0f172a;
    const eyeColor = 0x67e8f9;
    const bladeColor = 0xe2e8f0;
    const handleColor = 0x7c2d12;
    const outlineColor = 0x1e293b;
    const beltColor = 0x334155;
    const legSwing = Math.sin(walkStep) * 8;
    const armSwing = Math.cos(walkStep) * 7;

    graphics.lineStyle(3, outlineColor, 1);
    graphics.fillStyle(clothColor);
    graphics.fillRoundedRect(offsetX + 8, 18, 8, 15, 3);
    graphics.fillStyle(hoodColor);
    graphics.fillCircle(offsetX + 12, 12, 7);
    graphics.fillRect(offsetX + 7, 10, 10, 6);
    graphics.fillStyle(eyeColor);
    graphics.fillRect(offsetX + 9, 12, 2, 1);
    graphics.fillRect(offsetX + 13, 12, 2, 1);
    graphics.fillStyle(beltColor);
    graphics.fillRect(offsetX + 8, 27, 8, 2);

    const drawSword = (
      handX: number,
      handY: number,
      tipX: number,
      tipY: number,
    ) => {
      graphics.lineStyle(2.5, handleColor, 1);
      graphics.lineBetween(handX - 3, handY + 1, handX, handY);
      graphics.lineStyle(2, bladeColor, 1);
      graphics.lineBetween(handX, handY, tipX, tipY);
      graphics.lineStyle(1, eyeColor, 0.8);
      graphics.lineBetween(handX + 1, handY, tipX - 1, tipY - 1);
    };

    if (pose === "attack_windup") {
      graphics.lineBetween(offsetX + 12, 20, offsetX + 7, 26);
      graphics.lineBetween(offsetX + 12, 20, offsetX + 17, 12);
      graphics.lineBetween(offsetX + 12, 33, offsetX + 8, 45);
      graphics.lineBetween(offsetX + 12, 33, offsetX + 17, 43);
      drawSword(offsetX + 17, 12, offsetX + 22, 1);
      return;
    }

    if (pose === "attack_slash") {
      graphics.lineBetween(offsetX + 12, 20, offsetX + 7, 24);
      graphics.lineBetween(offsetX + 12, 20, offsetX + 18, 18);
      graphics.lineBetween(offsetX + 12, 33, offsetX + 8, 45);
      graphics.lineBetween(offsetX + 12, 33, offsetX + 18, 39);
      drawSword(offsetX + 18, 18, offsetX + 27, 16);
      return;
    }

    if (pose === "attack_recover") {
      graphics.lineBetween(offsetX + 12, 20, offsetX + 7, 24);
      graphics.lineBetween(offsetX + 12, 20, offsetX + 15, 24);
      graphics.lineBetween(offsetX + 12, 33, offsetX + 8, 45);
      graphics.lineBetween(offsetX + 12, 33, offsetX + 17, 44);
      drawSword(offsetX + 15, 24, offsetX + 21, 30);
      return;
    }

    if (pose === "hurt") {
      graphics.lineBetween(offsetX + 12, 20, offsetX + 5, 27);
      graphics.lineBetween(offsetX + 12, 20, offsetX + 17, 23);
      graphics.lineBetween(offsetX + 12, 33, offsetX + 8, 45);
      graphics.lineBetween(offsetX + 12, 33, offsetX + 18, 42);
      return;
    }

    if (pose === "idle") {
      graphics.lineBetween(offsetX + 12, 20, offsetX + 8, 25);
      graphics.lineBetween(offsetX + 12, 20, offsetX + 16, 24);
      graphics.lineBetween(offsetX + 12, 33, offsetX + 9, 45);
      graphics.lineBetween(offsetX + 12, 33, offsetX + 15, 45);
      drawSword(offsetX + 9, 26, offsetX + 5, 38);
      return;
    }

    graphics.lineBetween(offsetX + 12, 20, offsetX + 12 - armSwing, 28);
    graphics.lineBetween(offsetX + 12, 20, offsetX + 12 + armSwing, 28);
    graphics.lineBetween(offsetX + 12, 33, offsetX + 12 + legSwing, 45);
    graphics.lineBetween(offsetX + 12, 33, offsetX + 12 - legSwing, 45);
    drawSword(offsetX + 8, 27, offsetX + 4, 38);
  };

  if (!scene.textures.exists("player_body")) {
    graphics.clear();
    graphics.fillStyle(0xffffff);
    graphics.fillRect(0, 0, 1, 1);
    graphics.generateTexture("player_body", 1, 1);
  }

  if (!scene.textures.exists("dust_dot")) {
    graphics.clear();
    graphics.fillStyle(0xffffff);
    graphics.fillCircle(2, 2, 2);
    graphics.generateTexture("dust_dot", 4, 4);
  }

  if (!scene.textures.exists("enemy_sheet")) {
    graphics.clear();
    for (let i = 0; i < 8; i += 1) {
      drawStickmanFrame(i * 24, (i / 8) * Math.PI * 2, 0xa855f7, false);
    }
    graphics.generateTexture("enemy_sheet", 192, 48);
    const texture = scene.textures.get("enemy_sheet");
    for (let i = 0; i < 8; i += 1) {
      texture.add(i, 0, i * 24, 0, 24, 48);
    }
  }

  if (!scene.textures.exists("basic_ninja_sheet")) {
    graphics.clear();
    for (let i = 0; i < 8; i += 1) {
      drawBasicNinjaFrame(i * 24, "walk", (i / 8) * Math.PI * 2);
    }
    drawBasicNinjaFrame(192, "idle");
    drawBasicNinjaFrame(216, "attack_windup");
    drawBasicNinjaFrame(240, "attack_slash");
    drawBasicNinjaFrame(264, "attack_recover");
    drawBasicNinjaFrame(288, "hurt");
    graphics.generateTexture("basic_ninja_sheet", 312, 48);
    const texture = scene.textures.get("basic_ninja_sheet");
    for (let i = 0; i < 13; i += 1) {
      texture.add(i, 0, i * 24, 0, 24, 48);
    }
  }

  if (!scene.textures.exists("limbs")) {
    graphics.clear();
    graphics.lineStyle(2, 0xffffff);
    graphics.strokeCircle(10, 10, 6);
    graphics.lineBetween(30, 10, 30, 30);
    graphics.generateTexture("limbs", 40, 40);
    const limbTexture = scene.textures.get("limbs");
    limbTexture.add("head", 0, 0, 0, 20, 20);
    limbTexture.add("part", 0, 20, 0, 20, 40);
  }

  if (!scene.textures.exists("ladder")) {
    graphics.clear();
    graphics.lineStyle(4, 0x94a3b8);
    graphics.lineBetween(5, 0, 5, 40);
    graphics.lineBetween(35, 0, 35, 40);
    graphics.lineStyle(2, 0x94a3b8);
    graphics.lineBetween(5, 10, 35, 10);
    graphics.lineBetween(5, 20, 35, 20);
    graphics.lineBetween(5, 30, 35, 30);
    graphics.generateTexture("ladder", 40, 40);
  }

  if (!scene.textures.exists("tube")) {
    graphics.clear();
    graphics.fillStyle(0x22c55e);
    graphics.fillRect(5, 10, 30, 30);
    graphics.fillRect(0, 0, 40, 10);
    graphics.generateTexture("tube", 40, 40);
  }

  if (!scene.textures.exists("soft_light")) {
    graphics.clear();
    const canvas = scene.textures.createCanvas("soft_light", 400, 400);
    if (canvas) {
      const ctx = canvas.getContext();
      const gradient = ctx.createRadialGradient(200, 200, 0, 200, 200, 200);
      gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 400, 400);
      canvas.refresh();
    }
  }

  if (!scene.textures.exists("rain_drop")) {
    graphics.clear();
    graphics.lineStyle(1, 0x38bdf8, 0.5);
    graphics.lineBetween(0, 0, 0, 10);
    graphics.generateTexture("rain_drop", 1, 10);
  }

  if (!scene.textures.exists("training_dummy")) {
    graphics.clear();
    graphics.fillStyle(0x14532d);
    graphics.fillRoundedRect(10, 8, 12, 64, 4);
    graphics.fillStyle(0x22c55e);
    graphics.fillRect(8, 6, 16, 10);
    graphics.fillStyle(0x854d0e);
    graphics.fillRect(6, 66, 20, 8);
    graphics.lineStyle(2, 0xdcfce7, 0.8);
    graphics.strokeRoundedRect(10, 8, 12, 64, 4);
    graphics.generateTexture("training_dummy", 32, 80);
  }

  graphics.destroy();
}
