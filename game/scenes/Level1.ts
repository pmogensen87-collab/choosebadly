import Phaser from "phaser";

import { playSFX } from "@/game/effects/audio";
import type Enemy from "@/game/enemies/Enemy";
import { damageEnemy, killEnemy } from "@/game/enemies/enemySystem";
import type CameraController from "@/game/managers/cameraController";
import { initializeLevel1, updateLevel1 } from "@/game/managers/level1Lifecycle";
import type {
  Level1SceneData,
  SFXType,
} from "@/game/managers/level1Types";
import type Player from "@/game/player/Player";
import type TraversalSystem from "@/game/player/traversalSystem";
import { damagePlayer, killPlayer } from "@/game/player/playerSystem";
import { updateHUD } from "@/game/ui/hud";
import { performAttack } from "@/game/weapons/combat";
import type CombatManager from "@/game/weapons/combatManager";
import { preloadLevelAssets } from "@/game/world/assets";

export default class Level1 extends Phaser.Scene {
  cameraController!: CameraController;
  playerController!: Player;
  combatManager!: CombatManager;
  traversalSystem!: TraversalSystem;
  player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  isDead = false;
  isAttacking = false;
  isClimbing = false;
  coinsCollected = 0;
  hasKey = false;
  deathMessages = ["BAD CHOICE", "SKILL ISSUE", "SAD?", "TRY AGAIN?", "NICE TRY", "GIT GUD", "BYE BYE"];
  hiddenHazards!: Phaser.GameObjects.Group;
  enemies!: Phaser.Physics.Arcade.Group;
  enemyControllers!: Enemy[];
  ladders!: Phaser.Physics.Arcade.StaticGroup;
  ropes!: Phaser.Physics.Arcade.StaticGroup;
  oneWayPlatforms!: Phaser.Physics.Arcade.StaticGroup;
  ledges!: Phaser.Physics.Arcade.StaticGroup;
  tubes!: Phaser.Physics.Arcade.StaticGroup;
  coins!: Phaser.Physics.Arcade.StaticGroup;
  keyItems!: Phaser.Physics.Arcade.StaticGroup;
  lockedGates!: Phaser.Physics.Arcade.StaticGroup;
  weaponTargets!: Phaser.Physics.Arcade.StaticGroup;
  hudHealthGraphics!: Phaser.GameObjects.Graphics;
  hudCoinIcon!: Phaser.GameObjects.Image;
  hudCoinText!: Phaser.GameObjects.Text;
  hudKeyIcon!: Phaser.GameObjects.Image;
  hudKeyText!: Phaser.GameObjects.Text;
  hudComboGlowText!: Phaser.GameObjects.Text;
  hudComboText!: Phaser.GameObjects.Text;
  comboHits = 0;
  comboTier = 0;
  comboVisibleUntil = 0;
  comboFadeStartedAt = 0;
  backgroundMusic!: Phaser.Sound.BaseSound;
  lightOverlay!: Phaser.GameObjects.RenderTexture;
  softLight!: Phaser.GameObjects.Image;
  rainParticles!: Phaser.GameObjects.Particles.ParticleEmitter;
  audioCtx: AudioContext | null = null;

  constructor() {
    super("Level1");
  }

  preload() {
    preloadLevelAssets(this);
  }

  create(data: Level1SceneData = {}) {
    initializeLevel1(this, data);
  }

  update() {
    updateLevel1(this);
  }

  killPlayer() {
    killPlayer(this);
  }

  damagePlayer(sourceX?: number, sourceY?: number, amount?: number) {
    damagePlayer(this, sourceX, sourceY, amount);
  }

  damageEnemy(
    enemy: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody,
    amount?: number,
    knockbackX?: number,
    knockbackY?: number,
  ) {
    return damageEnemy(this, enemy, amount, knockbackX, knockbackY);
  }

  killEnemy(enemy: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
    killEnemy(this, enemy);
  }

  attack() {
    performAttack(this);
  }

  updateHUD() {
    updateHUD(this);
  }

  playSFX(type: SFXType) {
    playSFX(this, type);
  }
}
