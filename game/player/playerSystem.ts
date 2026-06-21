import Phaser from "phaser";

import Player from "@/game/player/Player";
import type Level1 from "@/game/scenes/Level1";
import { clearComboCounter } from "@/game/ui/hud";

const DEATH_RESTART_DELAY_MS = 1200;
const DEATH_PHYSICS_TIME_SCALE = 0.35;
const DEATH_TWEEN_TIME_SCALE = 0.45;
const DEATH_ANIMATION_TIME_SCALE = 0.35;

export function createPlayer(scene: Level1) {
  scene.playerController = new Player(scene);
  scene.player = scene.playerController.sprite;
}

export function registerPlayerWorldPhysics(
  scene: Level1,
  platforms: Phaser.Physics.Arcade.StaticGroup,
  landingDust: Phaser.GameObjects.Particles.ParticleEmitter,
) {
  scene.physics.add.collider(scene.player, platforms, () => {
    const impactSpeed = Math.abs(scene.player.body.velocity.y);

    if (
      scene.player.body.touching.down &&
      impactSpeed > 10
    ) {
      scene.tweens.add({
        targets: scene.player,
        scaleY: 0.8,
        scaleX: 1.2,
        duration: 100,
        yoyo: true,
        ease: "Quad.easeOut",
      });
      landingDust.emitParticleAt(scene.player.x, scene.player.y + 24, 5);
      scene.cameraController.shakeOnLanding(impactSpeed);
    }
  });
}

export function updatePlayer(scene: Level1) {
  scene.playerController.update();
}

export function damagePlayer(
  scene: Level1,
  sourceX?: number,
  sourceY?: number,
  amount = 1,
) {
  if (scene.isDead) {
    return;
  }

  const damaged = scene.playerController.takeDamage(sourceX, sourceY, amount);
  if (damaged) {
    scene.combatManager.clearCounterAttackWindow();
    clearComboCounter(scene);
  }
}

export function killPlayer(scene: Level1) {
  if (scene.isDead) {
    return;
  }

  scene.isDead = true;
  scene.combatManager.cancelAttack();
  scene.combatManager.clearCounterAttackWindow();
  clearComboCounter(scene);
  scene.playSFX("death");
  applyDeathSlowMotion(scene);
  playDeathCameraShake(scene);

  const deathX = scene.player.x;
  const deathY = scene.player.y;

  scene.playerController.cancelTransientStates();
  scene.playerController.setRenderVisible(false);
  scene.player.setVelocity(0, 0);
  scene.player.setVisible(false);

  spawnBloodBurst(scene, deathX, deathY);
  spawnBloodSplatter(scene, deathX, deathY);

  if (scene.textures.exists("limbs")) {
    const limbCount = 6;
    for (let i = 0; i < limbCount; i += 1) {
      const isHead = i === 0;
      const limb = scene.physics.add.sprite(
        deathX,
        deathY,
        "limbs",
        isHead ? "head" : "part",
      );

      if (limb.body) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 200 + Math.random() * 300;
        limb.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
        limb.setAngularVelocity(Math.random() * 1000 - 500);
        limb.setBounce(0.5);
        limb.setCollideWorldBounds(true);
      }
    }
  }

  showDeathMessage(scene, deathX, deathY);

  scene.time.delayedCall(DEATH_RESTART_DELAY_MS, () => {
    resetSceneTimeScales(scene);
    scene.scene.restart({ skipIntroFade: true });
  });
}

function applyDeathSlowMotion(scene: Level1) {
  scene.physics.world.timeScale = DEATH_PHYSICS_TIME_SCALE;
  scene.tweens.timeScale = DEATH_TWEEN_TIME_SCALE;
  scene.anims.globalTimeScale = DEATH_ANIMATION_TIME_SCALE;
}

function resetSceneTimeScales(scene: Level1) {
  scene.physics.world.timeScale = 1;
  scene.tweens.timeScale = 1;
  scene.anims.globalTimeScale = 1;
}

function playDeathCameraShake(scene: Level1) {
  scene.cameras.main.shake(320, 0.016, true);
}

function spawnBloodBurst(
  scene: Level1,
  x: number,
  y: number,
) {
  const burst = scene.add.particles(x, y - 6, "dust_dot", {
    tint: [0xf87171, 0xdc2626, 0x7f1d1d],
    speed: { min: 80, max: 420 },
    angle: { min: -160, max: -20 },
    gravityY: 900,
    lifespan: { min: 260, max: 760 },
    scale: { start: 1.8, end: 0.15 },
    alpha: { start: 0.95, end: 0 },
    rotate: { min: -180, max: 180 },
    quantity: 0,
    emitting: false,
  });

  burst.explode(28);
  scene.time.delayedCall(DEATH_RESTART_DELAY_MS, () => {
    burst.destroy();
  });
}

function spawnBloodSplatter(
  scene: Level1,
  x: number,
  y: number,
) {
  const splatters: Phaser.GameObjects.Ellipse[] = [];
  const splatterCount = 7;

  for (let index = 0; index < splatterCount; index += 1) {
    const splatter = scene.add.ellipse(
      x + Phaser.Math.Between(-30, 30),
      y + Phaser.Math.Between(6, 30),
      Phaser.Math.Between(12, 30),
      Phaser.Math.Between(6, 14),
      Phaser.Utils.Array.GetRandom([0x7f1d1d, 0x991b1b, 0xdc2626]),
      0.88,
    );
    splatter.setDepth(18);
    splatter.setAngle(Phaser.Math.Between(-55, 55));
    splatter.setScale(0.25);
    splatters.push(splatter);

    scene.tweens.add({
      targets: splatter,
      scaleX: 1,
      scaleY: 1,
      alpha: 0.95,
      duration: 180,
      ease: "Back.easeOut",
    });
  }

  scene.time.delayedCall(DEATH_RESTART_DELAY_MS - 180, () => {
    splatters.forEach((splatter) => {
      if (!splatter.active) {
        return;
      }

      scene.tweens.add({
        targets: splatter,
        alpha: 0,
        duration: 180,
        onComplete: () => splatter.destroy(),
      });
    });
  });
}

function showDeathMessage(
  scene: Level1,
  x: number,
  y: number,
) {
  const message = scene.deathMessages[
    Math.floor(Math.random() * scene.deathMessages.length)
  ];
  const text = scene.add.text(x, y - 118, message, {
    fontSize: "36px",
    color: "#fee2e2",
    fontStyle: "bold",
    fontFamily: "monospace",
    stroke: "#7f1d1d",
    strokeThickness: 8,
    align: "center",
  });
  text.setOrigin(0.5);
  text.setDepth(220);
  text.setScale(0.6);
  text.setAngle(Phaser.Math.Between(-4, 4));

  scene.tweens.add({
    targets: text,
    scaleX: 1.08,
    scaleY: 1.08,
    y: y - 132,
    duration: 220,
    ease: "Back.easeOut",
  });

  scene.time.delayedCall(DEATH_RESTART_DELAY_MS - 160, () => {
    if (!text.active) {
      return;
    }

    scene.tweens.add({
      targets: text,
      alpha: 0,
      duration: 160,
      onComplete: () => text.destroy(),
    });
  });
}
