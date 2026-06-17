import Phaser from "phaser";

type MovementKeys = {
  A: Phaser.Input.Keyboard.Key;
  D: Phaser.Input.Keyboard.Key;
  W: Phaser.Input.Keyboard.Key;
  S: Phaser.Input.Keyboard.Key;
  SHIFT: Phaser.Input.Keyboard.Key;
  X: Phaser.Input.Keyboard.Key;
  C: Phaser.Input.Keyboard.Key;
};

type FallingPlatform = Phaser.GameObjects.Rectangle & {
  body: Phaser.Physics.Arcade.Body;
  isFalling: boolean;
};

type Level1SceneData = {
  skipIntroFade?: boolean;
};

export default class Level1 extends Phaser.Scene {
  player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  keys!: MovementKeys;
  isDead = false;
  isAttacking = false;
  isClimbing = false;
  coinsCollected = 0;
  hasKey = false;
  deathMessages = ["BAD CHOICE", "SKILL ISSUE", "SAD?", "TRY AGAIN?", "L + RATIO", "GIT GUD"];
  fallingPlatforms!: Phaser.Physics.Arcade.Group;
  hiddenHazards!: Phaser.GameObjects.Group;
  enemies!: Phaser.Physics.Arcade.Group;
  ladders!: Phaser.Physics.Arcade.StaticGroup;
  tubes!: Phaser.Physics.Arcade.StaticGroup;
  coins!: Phaser.Physics.Arcade.StaticGroup;
  keyItems!: Phaser.Physics.Arcade.StaticGroup;
  lockedGates!: Phaser.Physics.Arcade.StaticGroup;
  hudCoinIcon!: Phaser.GameObjects.Image;
  hudCoinText!: Phaser.GameObjects.Text;
  hudKeyIcon!: Phaser.GameObjects.Image;
  hudKeyText!: Phaser.GameObjects.Text;
  backgroundMusic!: Phaser.Sound.BaseSound;
  lightOverlay!: Phaser.GameObjects.RenderTexture;
  softLight!: Phaser.GameObjects.Image;
  rainParticles!: Phaser.GameObjects.Particles.ParticleEmitter;
  audioCtx: AudioContext | null = null;

  constructor() {
    super("Level1");
  }

  preload() {
    if (!this.textures.exists("coin_spin")) {
      this.load.spritesheet("coin_spin", "/assets/coins/coin_spin.png", {
        frameWidth: 32,
        frameHeight: 32,
      });
    }
    if (!this.textures.exists("flame_loop")) {
      this.load.spritesheet("flame_loop", "/assets/traps/flame_loop.png", {
        frameWidth: 48,
        frameHeight: 48,
      });
    }
    if (!this.textures.exists("spike_fire")) {
      this.load.image("spike_fire", "/assets/traps/spike_fire.png");
    }
    if (!this.textures.exists("key_blue")) {
      this.load.image("key_blue", "/assets/keys/key_blue.png");
    }
    if (!this.textures.exists("coin_icon")) {
      this.load.image("coin_icon", "/assets/ui/coin_icon.png");
    }
    if (!this.textures.exists("key_icon")) {
      this.load.image("key_icon", "/assets/ui/key_icon.png");
    }
    if (!this.cache.audio.exists("bg_music")) {
      this.load.audio("bg_music", "/assets/audio/bg_music.mp3");
    }
    if (!this.cache.audio.exists("coin_pickup")) {
      this.load.audio("coin_pickup", "/assets/audio/coin_pickup.wav");
    }
    if (!this.cache.audio.exists("arcade_punch")) {
      this.load.audio("arcade_punch", "/assets/audio/arcade_punch.wav");
    }
    if (!this.cache.audio.exists("key_pickup")) {
      this.load.audio("key_pickup", "/assets/audio/key_pling.wav");
    }

    const graphics = this.add.graphics();
    graphics.setVisible(false);

    const drawFrame = (offsetX: number, walkStep: number, isJumping: boolean, attackType: "none" | "punch" | "kick" = "none", color = 0xffffff, hasHat = true) => {
      // Hat (Fedora) with White Outline for visibility
      if (hasHat) {
        graphics.lineStyle(1.5, 0xffffff, 1);
        graphics.strokeRect(offsetX + 2, 8, 20, 2); // Brim outline
        graphics.strokeRect(offsetX + 6, 3, 12, 5); // Top outline
        graphics.fillStyle(0x000000);
        graphics.fillRect(offsetX + 2, 8, 20, 2); // Brim fill
        graphics.fillRect(offsetX + 6, 3, 12, 5); // Top fill

        // Neon Sunglasses
        graphics.fillStyle(0x38bdf8);
        graphics.fillRect(offsetX + 8, 12, 8, 2);
      }

      graphics.lineStyle(2.5, color); // Chunkier lines
      // Head
      graphics.strokeCircle(offsetX + 12, 12, 7);

      // Body
      graphics.lineBetween(offsetX + 12, 19, offsetX + 12, 35);

      if (isJumping) {
        // Jump pose
        graphics.lineBetween(offsetX + 12, 22, offsetX + 2, 20); // L Arm up
        graphics.lineBetween(offsetX + 12, 22, offsetX + 22, 20); // R Arm up
        graphics.lineBetween(offsetX + 12, 35, offsetX + 6, 42); // L Leg tucked
        graphics.lineBetween(offsetX + 12, 35, offsetX + 18, 42); // R Leg tucked
      } else if (attackType === "punch") {
        graphics.lineBetween(offsetX + 12, 22, offsetX + 2, 30); // L Arm
        graphics.lineBetween(offsetX + 12, 22, offsetX + 28, 22); // Punch Arm
        graphics.lineBetween(offsetX + 12, 35, offsetX + 8, 48); // Legs
        graphics.lineBetween(offsetX + 12, 35, offsetX + 16, 48);
      } else if (attackType === "kick") {
        graphics.lineBetween(offsetX + 12, 22, offsetX + 2, 25); // Arms
        graphics.lineBetween(offsetX + 12, 22, offsetX + 22, 25);
        graphics.lineBetween(offsetX + 12, 35, offsetX + 4, 48); // Support Leg
        graphics.lineBetween(offsetX + 12, 35, offsetX + 28, 35); // Kick Leg
      } else {
        // Smoother Walk cycle
        const legSwing = Math.sin(walkStep) * 14;
        const armSwing = Math.cos(walkStep) * 12;
        graphics.lineBetween(offsetX + 12, 22, offsetX + 12 - armSwing, 32);
        graphics.lineBetween(offsetX + 12, 22, offsetX + 12 + armSwing, 32);
        graphics.lineBetween(offsetX + 12, 35, offsetX + 12 + legSwing, 48);
        graphics.lineBetween(offsetX + 12, 35, offsetX + 12 - legSwing, 48);
      }
    };

    if (!this.textures.exists("stickman_sheet")) {
      // Generate Stickman Sheet (frames 0-7: walk, 8: jump, 9: punch, 10: kick)
      for (let i = 0; i < 8; i++) {
        drawFrame(i * 24, (i / 8) * Math.PI * 2, false);
      }
      drawFrame(192, 0, true); // 8: Jump
      drawFrame(216, 0, false, "punch"); // 9: Punch
      drawFrame(240, 0, false, "kick"); // 10: Kick
      graphics.generateTexture("stickman_sheet", 264, 48);
      const tex = this.textures.get("stickman_sheet");
      for (let i = 0; i < 11; i++) tex.add(i, 0, i * 24, 0, 24, 48);
    }

    if (!this.textures.exists("enemy_sheet")) {
      // Generate Enemy Sheet (Purple)
      graphics.clear();
      for (let i = 0; i < 8; i++) {
        drawFrame(i * 24, (i / 8) * Math.PI * 2, false, "none", 0xa855f7, false);
      }
      graphics.generateTexture("enemy_sheet", 192, 48);
      const eTex = this.textures.get("enemy_sheet");
      for (let i = 0; i < 8; i++) eTex.add(i, 0, i * 24, 0, 24, 48);
    }

    if (!this.textures.exists("limbs")) {
      // Generate Limb Textures for Shatter
      graphics.clear();
      graphics.lineStyle(2, 0xffffff);
      graphics.strokeCircle(10, 10, 6); // Head (0)
      graphics.lineBetween(30, 10, 30, 30); // Body/Limb (1)
      graphics.generateTexture("limbs", 40, 40);
      const limbTex = this.textures.get("limbs");
      limbTex.add("head", 0, 0, 0, 20, 20);
      limbTex.add("part", 0, 20, 0, 20, 40);
    }

    if (!this.textures.exists("ladder")) {
      // Generate Ladder Texture
      graphics.clear();
      graphics.lineStyle(4, 0x94a3b8);
      graphics.lineBetween(5, 0, 5, 40); // Left rail
      graphics.lineBetween(35, 0, 35, 40); // Right rail
      graphics.lineStyle(2, 0x94a3b8);
      graphics.lineBetween(5, 10, 35, 10);
      graphics.lineBetween(5, 20, 35, 20);
      graphics.lineBetween(5, 30, 35, 30);
      graphics.generateTexture("ladder", 40, 40);
    }

    if (!this.textures.exists("tube")) {
      // Generate Tube Texture
      graphics.clear();
      graphics.fillStyle(0x22c55e); // Neon Green
      graphics.fillRect(5, 10, 30, 30); // Base
      graphics.fillRect(0, 0, 40, 10); // Top lip
      graphics.generateTexture("tube", 40, 40);
    }

    if (!this.textures.exists("soft_light")) {
      // Generate Soft Light Texture
      graphics.clear();
      const canvas = this.textures.createCanvas("soft_light", 400, 400);
      if (canvas) {
        const ctx = canvas.getContext();
        const grd = ctx.createRadialGradient(200, 200, 0, 200, 200, 200);
        grd.addColorStop(0, "rgba(255, 255, 255, 1)");
        grd.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, 400, 400);
        canvas.refresh();
      }
    }

    if (!this.textures.exists("rain_drop")) {
      // Generate Rain Texture
      graphics.clear();
      graphics.lineStyle(1, 0x38bdf8, 0.5);
      graphics.lineBetween(0, 0, 0, 10);
      graphics.generateTexture("rain_drop", 1, 10);
    }
    graphics.destroy();
  }

  create(data: Level1SceneData = {}) {
    // 1. Initial State Reset
    this.isDead = false;
    this.isAttacking = false;
    this.coinsCollected = 0;
    this.hasKey = false;

    // 2. Camera & FX Hard Reset
    this.cameras.main.resetFX();
    this.cameras.main.stopFollow();
    this.cameras.main.alpha = 1;
    this.cameras.main.setBackgroundColor("#0f172a");

    // 3. World setup
    this.physics.world.setBounds(0, 0, 2200, 540);
    if (!data.skipIntroFade) {
      this.cameras.main.fadeIn(1000, 0, 0, 0);
    }
    this.setupBackgroundMusic();

    // Add Parallax Buildings
    const bgGraphics = this.add.graphics();
    bgGraphics.fillStyle(0x1e293b, 0.3);
    for (let i = 0; i < 15; i++) {
      const h = 200 + Math.random() * 400;
      const w = 100 + Math.random() * 150;
      const bx = i * 250;
      const by = 540 - h;
      bgGraphics.fillRect(bx, by, w, h);
      bgGraphics.lineStyle(1, 0x334155, 0.2);
      bgGraphics.strokeRect(bx, by, w, h);

      // Random flickering windows
      for (let j = 0; j < 5; j++) {
        const wx = bx + 10 + Math.random() * (w - 20);
        const wy = by + 10 + Math.random() * (h - 20);
        const win = this.add.rectangle(wx, wy, 4, 6, 0x38bdf8, 0.2);
        win.setScrollFactor(0.2);
        this.tweens.add({
          targets: win,
          alpha: 0.8,
          duration: 500 + Math.random() * 2000,
          yoyo: true,
          repeat: -1,
          delay: Math.random() * 2000
        });
      }
    }
    bgGraphics.setScrollFactor(0.2);

    // Add moving Airships
    for (let i = 0; i < 3; i++) {
      const ship = this.add.rectangle(Math.random() * 2200, 50 + Math.random() * 150, 60, 20, 0x0f172a);
      ship.setStrokeStyle(1, 0x38bdf8, 0.3);
      ship.setScrollFactor(0.1);
      this.tweens.add({
        targets: ship,
        x: "+=2200",
        duration: 40000 + Math.random() * 20000,
        repeat: -1
      });
    }

    // Add Blueprint Grid
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x1e293b, 0.5);
    for (let x = 0; x < 2200; x += 40) {
      grid.lineBetween(x, 0, x, 540);
    }
    for (let y = 0; y < 540; y += 40) {
      grid.lineBetween(0, y, 2200, y);
    }

    // Animations
    if (!this.anims.exists("idle")) {
      this.anims.create({
        key: "idle",
        frames: [{ key: "stickman_sheet", frame: 0 }],
      });
    }
    if (!this.anims.exists("walk")) {
      this.anims.create({
        key: "walk",
        frames: [
          { key: "stickman_sheet", frame: 0 },
          { key: "stickman_sheet", frame: 1 },
          { key: "stickman_sheet", frame: 2 },
          { key: "stickman_sheet", frame: 3 },
          { key: "stickman_sheet", frame: 4 },
          { key: "stickman_sheet", frame: 5 },
          { key: "stickman_sheet", frame: 6 },
          { key: "stickman_sheet", frame: 7 },
        ],
        frameRate: 15,
        repeat: -1,
      });
    }
    if (!this.anims.exists("jump")) {
      this.anims.create({
        key: "jump",
        frames: [{ key: "stickman_sheet", frame: 8 }],
      });
    }
    if (!this.anims.exists("punch")) {
      this.anims.create({
        key: "punch",
        frames: [{ key: "stickman_sheet", frame: 9 }],
      });
    }
    if (!this.anims.exists("kick")) {
      this.anims.create({
        key: "kick",
        frames: [{ key: "stickman_sheet", frame: 10 }],
      });
    }
    if (!this.anims.exists("enemy_walk")) {
      this.anims.create({
        key: "enemy_walk",
        frames: this.anims.generateFrameNumbers("enemy_sheet", { start: 0, end: 7 }),
        frameRate: 10,
        repeat: -1,
      });
    }
    if (!this.anims.exists("burn")) {
      this.anims.create({
        key: "burn",
        frames: this.anims.generateFrameNumbers("flame_loop", { start: 0, end: 3 }),
        frameRate: 10,
        repeat: -1,
      });
    }
    if (!this.anims.exists("coin_spin")) {
      this.anims.create({
        key: "coin_spin",
        frames: this.anims.generateFrameNumbers("coin_spin", { start: 0, end: 3 }),
        frameRate: 12,
        repeat: -1,
      });
    }

    const platforms = this.physics.add.staticGroup();
    const createStyledPlatform = (x: number, y: number, w: number, h: number) => {
      // Glow layers
      this.add.rectangle(x, y, w + 4, h + 4, 0x38bdf8, 0.1);
      this.add.rectangle(x, y, w + 2, h + 2, 0x38bdf8, 0.2);
      const rect = this.add.rectangle(x, y, w, h, 0x1e293b);
      rect.setStrokeStyle(2, 0x38bdf8); // Neon Blue Outline
      platforms.add(rect);
    };

    // Easier platform layout
    createStyledPlatform(450, 520, 900, 40);
    createStyledPlatform(1200, 520, 400, 40);
    createStyledPlatform(1800, 520, 800, 40);

    // Elevated platforms reachable by ladders
    createStyledPlatform(800, 300, 300, 30);
    createStyledPlatform(1300, 250, 300, 30);

    // Falling platforms - even more fair delay
    this.fallingPlatforms = this.physics.add.group();
    const createSplittingPlatform = (x: number, y: number, w: number, h: number) => {
      const halfW = w / 2;
      const p1 = this.add.rectangle(x - halfW / 2, y, halfW - 2, h, 0x1e293b) as FallingPlatform;
      const p2 = this.add.rectangle(x + halfW / 2, y, halfW - 2, h, 0x1e293b) as FallingPlatform;
      p1.setStrokeStyle(2, 0x38bdf8);
      p2.setStrokeStyle(2, 0x38bdf8);
      this.fallingPlatforms.add(p1);
      this.fallingPlatforms.add(p2);
      [p1, p2].forEach((p) => {
        p.body.setImmovable(true);
        p.body.allowGravity = false;
        p.isFalling = false;
      });
    };

    createSplittingPlatform(1050, 440, 200, 30);
    createSplittingPlatform(1550, 400, 200, 30);

    // Ladders
    this.ladders = this.physics.add.staticGroup();
    const createLadder = (x: number, y: number, h: number) => {
      for (let i = 0; i < h; i++) {
        this.ladders.create(x, y - (i * 40), "ladder");
      }
    };
    createLadder(600, 500, 6); // Ladder to elevated platform 1
    createLadder(1100, 500, 7); // Ladder to elevated platform 2

    // Tubes
    this.tubes = this.physics.add.staticGroup();
    this.tubes.create(2100, 500, "tube"); // Exit tube
    this.tubes.create(300, 500, "tube");  // Entrance tube (example)

    const hazards = this.physics.add.staticGroup();
    const createFlameHazard = (x: number, y: number) => {
      const f = hazards.create(x, y, "flame_loop", 0) as Phaser.Types.Physics.Arcade.SpriteWithStaticBody;
      f.setDisplaySize(36, 36);
      f.refreshBody();
      f.play("burn");
      if (f.body) {
        f.body.setSize(20, 20); // Even smaller hitbox
      }
      return f;
    };

    createFlameHazard(850, 485);
    createFlameHazard(1400, 485);

    const createSpikeHazard = (x: number, y: number) => {
      const spike = hazards.create(x, y, "spike_fire") as Phaser.Types.Physics.Arcade.SpriteWithStaticBody;
      spike.setDisplaySize(36, 36);
      spike.refreshBody();
      if (spike.body) {
        spike.body.setSize(20, 20);
      }
      return spike;
    };

    // Hidden hazard (invisible until close)
    this.hiddenHazards = this.add.group();
    const hiddenSpike = createSpikeHazard(1050, 405);
    hiddenSpike.setVisible(false);

    // Tiny hint for the spike (fairness)
    const hint = this.add.rectangle(980, 410, 4, 4, 0xffaa00, 0.3);
    this.tweens.add({
      targets: hint,
      alpha: 0.1,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    this.hiddenHazards.add(hiddenSpike);
    // Hazards group already includes hiddenSpike because createSpikeHazard adds to it

    this.player = this.physics.add.sprite(100, 450, "stickman_sheet", 0);
    this.player.setSize(24, 48);
    this.player.setCollideWorldBounds(false);

    // Enemies
    this.enemies = this.physics.add.group();
    const createEnemy = (x: number, y: number) => {
      const e = this.enemies.create(x, y, "enemy_sheet") as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      e.setSize(24, 48);
      e.play("enemy_walk");
      e.setCollideWorldBounds(true);
      return e;
    };

    createEnemy(500, 450);
    createEnemy(1500, 300);

    this.physics.add.collider(this.enemies, platforms);
    this.physics.add.collider(this.enemies, this.fallingPlatforms);
    this.physics.add.overlap(this.player, this.enemies, (p, e) => {
      if (!this.isAttacking) this.killPlayer();
      else this.killEnemy(e as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody);
    });

    // Dust particles
    const particles = this.add.particles(0, 0, "stickman_sheet", {
      frame: 0,
      scale: { start: 0.1, end: 0 },
      alpha: { start: 0.3, end: 0 },
      lifespan: 400,
      speed: { min: 20, max: 60 },
      gravityY: -50,
      emitting: false,
    });

    this.physics.add.collider(this.player, platforms, () => {
      if (this.player.body.touching.down && Math.abs(this.player.body.velocity.y) > 10) {
        // Squash on land
        this.tweens.add({
          targets: this.player,
          scaleY: 0.8,
          scaleX: 1.2,
          duration: 100,
          yoyo: true,
          ease: "Quad.easeOut"
        });
        particles.emitParticleAt(this.player.x, this.player.y + 24, 5);
      }
    });

    this.physics.add.collider(this.player, this.fallingPlatforms, (p, platform) => {
      const fallingPlatform = platform as FallingPlatform;

      if (this.player.body.touching.down && !fallingPlatform.isFalling) {
        fallingPlatform.isFalling = true;

        // Squash on land
        this.tweens.add({
          targets: this.player,
          scaleY: 0.8,
          scaleX: 1.2,
          duration: 100,
          yoyo: true,
          ease: "Quad.easeOut"
        });
        particles.emitParticleAt(this.player.x, this.player.y + 24, 3);

        // Shake before falling - longer duration (600ms total)
        this.tweens.add({
          targets: fallingPlatform,
          x: fallingPlatform.x + 2,
          duration: 50,
          yoyo: true,
          repeat: 11, // 12 total cycles = 600ms
          onComplete: () => {
            fallingPlatform.body.allowGravity = true;
          }
        });
      }
    });
    this.physics.add.overlap(this.player, hazards, () => this.killPlayer());
    this.physics.add.overlap(this.player, this.ladders, () => {
      this.isClimbing = true;
    });

    // Coins
    this.coins = this.physics.add.staticGroup();
    [500, 700, 1200, 1400, 1800].forEach(x => {
      const c = this.coins.create(x, 480, "coin_spin", 0) as Phaser.Types.Physics.Arcade.SpriteWithStaticBody;
      c.setDisplaySize(20, 20);
      c.refreshBody();
      c.play("coin_spin");
      this.tweens.add({
        targets: c,
        y: c.y - 10,
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
      });
    });

    this.physics.add.overlap(this.player, this.coins, (p, c) => {
      c.destroy();
      this.coinsCollected++;
      this.updateHUD();
      this.playSFX("coin");
      this.cameras.main.shake(50, 0.002);
    });

    // Keys and Gates
    this.keyItems = this.physics.add.staticGroup();
    const keyItem = this.keyItems.create(1300, 200, "key_blue") as Phaser.Types.Physics.Arcade.SpriteWithStaticBody;
    keyItem.setDisplaySize(24, 24);
    keyItem.refreshBody();
    if (keyItem.body) {
      keyItem.body.setSize(18, 18);
    }

    this.lockedGates = this.physics.add.staticGroup();
    const gate = this.add.rectangle(1900, 400, 20, 150, 0x38bdf8, 0.3);
    gate.setStrokeStyle(2, 0x38bdf8);
    this.lockedGates.add(gate);

    this.physics.add.overlap(this.player, this.keyItems, (p, k) => {
      k.destroy();
      this.hasKey = true;
      this.playSFX("key");
      this.updateHUD();
    });

    this.physics.add.collider(this.player, this.lockedGates, (p, g) => {
      if (this.hasKey) {
        g.destroy();
        this.hasKey = false;
        this.playSFX("death"); // Use descending sound for gate opening
        this.updateHUD();
      } else {
        this.cameras.main.shake(100, 0.005);
      }
    });

    // HUD Redesign
    const hudBg = this.add.graphics();
    hudBg.fillStyle(0x0f172a, 0.8);
    hudBg.lineStyle(2, 0x38bdf8, 0.5);
    hudBg.fillRoundedRect(10, 10, 280, 50, 8);
    hudBg.strokeRoundedRect(10, 10, 280, 50, 8);
    hudBg.setScrollFactor(0);
    hudBg.setDepth(199);

    this.hudCoinIcon = this.add.image(35, 35, "coin_icon")
      .setScrollFactor(0)
      .setDepth(200)
      .setDisplaySize(24, 24);
    this.hudCoinText = this.add.text(55, 23, "0", {
      fontSize: "18px",
      color: "#38bdf8",
      fontStyle: "bold",
      fontFamily: "monospace"
    })
      .setScrollFactor(0)
      .setDepth(200);
    this.hudKeyIcon = this.add.image(125, 35, "key_icon")
      .setScrollFactor(0)
      .setDepth(200)
      .setDisplaySize(24, 24);
    this.hudKeyText = this.add.text(145, 23, "KEY: NONE", {
      fontSize: "18px",
      color: "#38bdf8",
      fontStyle: "bold",
      fontFamily: "monospace"
    })
      .setScrollFactor(0)
      .setDepth(200);
    this.updateHUD();

    // Light Overlay - Set higher depth to ensure it's on top but doesn't block UI
    this.lightOverlay = this.add.renderTexture(0, 0, 960, 540).setScrollFactor(0);
    this.lightOverlay.setAlpha(0.85);
    this.lightOverlay.setDepth(100);
    this.softLight = this.add.image(0, 0, "soft_light").setVisible(false);

    // Fullscreen key
    this.input.keyboard!.on("keydown-F", () => {
      if (this.scale.isFullscreen) {
        this.scale.stopFullscreen();
      } else {
        this.scale.startFullscreen();
      }
    });

    // Neon Rain
    this.rainParticles = this.add.particles(0, 0, "rain_drop", {
      x: { min: 0, max: 2200 },
      y: -10,
      lifespan: 1500,
      speedY: { min: 600, max: 900 },
      scaleY: { min: 1, max: 2 },
      alpha: { start: 0.4, end: 0.1 },
      quantity: 3,
      blendMode: "ADD"
    });

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys("A,D,W,S,SHIFT,X,C") as MovementKeys;

    // Mouse Input for Combat
    this.input.mouse!.disableContextMenu();
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.isDead) return;
      if (pointer.leftButtonDown()) {
        this.attack("punch");
      } else if (pointer.rightButtonDown()) {
        this.attack("kick");
      }
    });

    this.cameras.main.setBounds(0, 0, 2200, 540);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
  }

  setupBackgroundMusic() {
    const existingMusic = this.sound.get("bg_music");
    if (existingMusic) {
      this.backgroundMusic = existingMusic;
    } else {
      this.backgroundMusic = this.sound.add("bg_music", {
        loop: true,
        volume: 0.25,
      });
    }

    const startMusic = () => {
      if (!this.backgroundMusic) return;

      if (this.backgroundMusic.isPlaying) return;

      if (this.backgroundMusic.isPaused) {
        this.backgroundMusic.resume();
        return;
      }

      this.backgroundMusic.play({
        loop: true,
        volume: 0.25,
      });
    };

    if (!this.sound.locked) {
      startMusic();
    }

    this.input.once("pointerdown", startMusic);
    this.input.keyboard?.once("keydown", startMusic);
  }

  killPlayer() {
    if (this.isDead) return;

    this.isDead = true;
    this.playSFX("death");
    this.player.setVelocity(0, 0);
    this.player.setVisible(false);

    // Shatter Effect - Only if textures are ready
    if (this.textures.exists("limbs")) {
      const limbCount = 6;
      for (let i = 0; i < limbCount; i++) {
        const isHead = i === 0;
        const limb = this.physics.add.sprite(
          this.player.x,
          this.player.y,
          "limbs",
          isHead ? "head" : "part"
        );

        if (limb.body) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 200 + Math.random() * 300;
          limb.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
          limb.setAngularVelocity(Math.random() * 1000 - 500);
          limb.setBounce(0.5);
          limb.setCollideWorldBounds(true);
        }

        this.time.delayedCall(1200, () => {
          if (limb && limb.active) {
            this.tweens.add({
              targets: limb,
              alpha: 0,
              duration: 300,
              onComplete: () => limb.destroy()
            });
          }
        });
      }
    }

    const msg = this.deathMessages[Math.floor(Math.random() * this.deathMessages.length)];
    this.add.text(this.player.x - 110, this.player.y - 120, msg, {
      fontSize: "32px",
      color: "#ff3333",
    });

    // Respawn without intro fade.
    this.time.delayedCall(1200, () => {
      this.cameras.main.fadeOut(800, 0, 0, 0);
      this.cameras.main.once("camerafadeoutcomplete", () => {
        this.scene.restart({ skipIntroFade: true });
      });
    });
  }

  killEnemy(enemy: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
    if (!enemy.active) return;

    this.playSFX("punch");
    // Impact effects
    this.cameras.main.shake(150, 0.015);
    enemy.setTint(0xffffff); // Flash white

    // Knockback based on player orientation
    const knockbackDir = this.player.flipX ? 1 : -1;
    enemy.setVelocity(knockbackDir * 300, -200);

    this.time.paused = true;
    setTimeout(() => { this.time.paused = false; }, 80); // Better hit-stop

    const x = enemy.x;
    const y = enemy.y;

    // Neon Impact Sparks
    const sparks = this.add.particles(x, y, "coin_spin", {
      frame: 0,
      scale: { start: 0.2, end: 0 },
      speed: { min: 100, max: 400 },
      lifespan: 300,
      alpha: { start: 1, end: 0 },
      quantity: 10,
      emitting: false
    });
    sparks.explode(15);

    this.time.delayedCall(80, () => {
      if (enemy.active) enemy.destroy();
    });

    // Shatter Effect (Purple)
    for (let i = 0; i < 5; i++) {
      const part = this.physics.add.sprite(x, y, "limbs", i === 0 ? "head" : "part");
      part.setTint(0xa855f7);
      const angle = Math.random() * Math.PI * 2;
      const speed = 200 + Math.random() * 200;
      part.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      part.setAngularVelocity(Math.random() * 1000 - 500);
      this.time.delayedCall(1000, () => {
        this.tweens.add({ targets: part, alpha: 0, duration: 500, onComplete: () => part.destroy() });
      });
    }
  }

  update() {
    // Always update spotlight even if dead, to prevent freeze
    if (this.lightOverlay && this.softLight) {
      this.lightOverlay.clear();
      this.lightOverlay.fill(0x000000, 1);
      const lightX = this.player.x - this.cameras.main.scrollX;
      const lightY = this.player.y - this.cameras.main.scrollY;
      this.lightOverlay.erase(this.softLight, lightX, lightY);
    }

    if (this.isDead) return;

    // Reset climbing state at start of update
    const wasClimbing = this.isClimbing;
    this.isClimbing = false;

    // Check for hidden hazards
    this.hiddenHazards.getChildren().forEach((h) => {
      const hazard = h as Phaser.GameObjects.Sprite;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, hazard.x, hazard.y);
      if (dist < 100) {
        hazard.setVisible(true);
      }
    });

    this.enemies.getChildren().forEach((e) => {
      const enemy = e as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);

      if (dist < 400) {
        // Horizontal movement only
        const dir = this.player.x < enemy.x ? -1 : 1;
        enemy.setVelocityX(dir * 120);
        enemy.setFlipX(dir < 0);

        // Simple Jump logic if blocked or player is higher
        if (enemy.body.blocked.down && (enemy.body.blocked.left || enemy.body.blocked.right || (this.player.y < enemy.y - 100 && Math.abs(this.player.x - enemy.x) < 100))) {
          enemy.setVelocityY(-450);
        }
      } else {
        enemy.setVelocityX(0);
      }
    });

    // Reset climbing state at start of update

    const isSprinting = this.keys.SHIFT.isDown;
    const speed = isSprinting ? 460 : 300;
    const jump = isSprinting ? -480 : -450;

    // Combat Input (Keyboard Alternatives)
    if (Phaser.Input.Keyboard.JustDown(this.keys.X)) this.attack("punch");
    if (Phaser.Input.Keyboard.JustDown(this.keys.C)) this.attack("kick");

    // Tube Input
    if (Phaser.Input.Keyboard.JustDown(this.keys.S)) {
      this.physics.overlap(this.player, this.tubes, (p, t) => {
        const tube = t as Phaser.GameObjects.Sprite;
        if (tube.x > 2000) {
          // Exit tube - restart for now or go to secret
          this.scene.restart({ skipIntroFade: true });
        } else if (tube.x < 500) {
          // Entrance tube - teleport to middle
          this.player.setPosition(1200, 450);
        }
      });
    }

    if (this.isAttacking) return;

    this.player.setVelocityX(0);

    // Climbing Logic
    if (wasClimbing) {
      this.player.body.allowGravity = false;
      this.player.setVelocityY(0);

      if (this.keys.W.isDown || this.cursors.up.isDown) {
        this.player.setVelocityY(-200);
      } else if (this.keys.S.isDown || this.cursors.down.isDown) {
        this.player.setVelocityY(200);
      }
    } else {
      this.player.body.allowGravity = true;
    }

    if (this.cursors.left.isDown || this.keys.A.isDown) {
      this.player.setVelocityX(-speed);
      this.player.setFlipX(true);
    }

    if (this.cursors.right.isDown || this.keys.D.isDown) {
      this.player.setVelocityX(speed);
      this.player.setFlipX(false);
    }

    // Ghost trail when sprinting
    if (isSprinting && Math.abs(this.player.body.velocity.x) > 0 && Math.random() > 0.4) {
      const ghost = this.add.sprite(this.player.x, this.player.y, "stickman_sheet", this.player.frame.name);
      ghost.setFlipX(this.player.flipX);
      ghost.setAlpha(0.5);
      ghost.setTint(0x38bdf8);
      this.tweens.add({
        targets: ghost,
        alpha: 0,
        duration: 200,
        onComplete: () => ghost.destroy()
      });
    }

    if (
      (this.cursors.space.isDown || this.cursors.up.isDown || this.keys.W.isDown) &&
      this.player.body.blocked.down
    ) {
      this.player.setVelocityY(jump);
      this.playSFX("jump");
      // Stretch on jump
      this.tweens.add({
        targets: this.player,
        scaleY: 1.3,
        scaleX: 0.8,
        duration: 100,
        yoyo: true,
        ease: "Quad.easeOut"
      });
    }

    // Animation control
    if (!this.player.body.blocked.down) {
      this.player.anims.play("jump", true);
    } else if (this.player.body.velocity.x !== 0) {
      this.player.anims.play("walk", true);
      // Dynamic animation speed based on velocity
      const animScale = Math.abs(this.player.body.velocity.x) / 300;
      this.player.anims.timeScale = animScale;
    } else {
      this.player.anims.play("idle", true);
      this.player.anims.timeScale = 1;
      // Reset scale just in case
      this.player.setScale(1);
    }

    if (this.player.y > 620) {
      this.killPlayer();
    }
  }

  attack(type: "punch" | "kick") {
    if (this.isAttacking) return;
    this.isAttacking = true;
    this.playSFX("punch");
    this.player.setVelocityX(0);
    this.player.anims.play(type, true);

    this.time.delayedCall(300, () => {
      this.isAttacking = false;
    });
  }

  updateHUD() {
    this.hudCoinText.setText(`${this.coinsCollected}`);
    this.hudKeyText.setText(`KEY: ${this.hasKey ? "MASTER" : "NONE"}`);
    this.hudKeyIcon.setAlpha(this.hasKey ? 1 : 0.45);
  }

  playSFX(type: "jump" | "punch" | "coin" | "key" | "death") {
    try {
      if (type === "coin") {
        this.sound.play("coin_pickup", {
          volume: 0.35,
        });
        return;
      }

      if (type === "key") {
        this.sound.play("key_pickup", {
          volume: 0.35,
        });
        return;
      }

      if (type === "punch") {
        this.sound.play("arcade_punch", {
          volume: 0.35,
        });
        return;
      }

      if (!this.audioCtx) {
        const audioWindow = window as Window & typeof globalThis & {
          webkitAudioContext?: typeof AudioContext;
        };
        const AudioContextClass = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
        if (!AudioContextClass) return;
        this.audioCtx = new AudioContextClass();
      }

      const ctx = this.audioCtx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === "jump") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === "death") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.5);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
      }
    } catch (e) {
      console.warn("SFX failed", e);
    }
  }
}
