import { setupBackgroundMusic } from "@/game/effects/audio";
import {
  createLandingDust,
  createLevelBackground,
  createLighting,
  createRain,
  updateLighting,
} from "@/game/effects/environment";
import {
  createEnemies,
  registerEnemyEncounters,
  updateEnemies,
} from "@/game/enemies/enemySystem";
import CameraController from "@/game/managers/cameraController";
import {
  LEVEL_HEIGHT,
  LEVEL_WIDTH,
} from "@/game/managers/level1Types";
import type { Level1SceneData } from "@/game/managers/level1Types";
import {
  createPlayer,
  registerPlayerWorldPhysics,
  updatePlayer,
} from "@/game/player/playerSystem";
import type Level1 from "@/game/scenes/Level1";
import { createHUD, updateComboCounter } from "@/game/ui/hud";
import CombatManager from "@/game/weapons/combatManager";
import { createLevelAnimations } from "@/game/world/animations";
import {
  buildLevelWorld,
  revealHiddenHazards,
  wireWorldInteractions,
} from "@/game/world/levelBuilder";

export function initializeLevel1(
  scene: Level1,
  data: Level1SceneData = {},
) {
  scene.isDead = false;
  scene.isAttacking = false;
  scene.isClimbing = false;
  scene.coinsCollected = 0;
  scene.hasKey = false;
  scene.comboHits = 0;
  scene.comboTier = 0;
  scene.comboVisibleUntil = 0;
  scene.comboFadeStartedAt = 0;

  scene.cameras.main.resetFX();
  scene.cameras.main.stopFollow();
  scene.cameras.main.alpha = 1;
  scene.cameras.main.setBackgroundColor("#0f172a");
  scene.physics.world.timeScale = 1;
  scene.tweens.timeScale = 1;
  scene.anims.globalTimeScale = 1;

  scene.physics.world.setBounds(0, 0, LEVEL_WIDTH, LEVEL_HEIGHT);
  if (!data.skipIntroFade) {
    scene.cameras.main.fadeIn(1000, 0, 0, 0);
  }

  setupBackgroundMusic(scene);
  createLevelBackground(scene);
  createLevelAnimations(scene);

  const world = buildLevelWorld(scene);
  createPlayer(scene);
  scene.combatManager = new CombatManager(scene);
  scene.cameraController = new CameraController(scene);
  createEnemies(scene);
  registerEnemyEncounters(scene, world.platforms);

  const landingDust = createLandingDust(scene);
  registerPlayerWorldPhysics(scene, world.platforms, landingDust);

  createHUD(scene);
  wireWorldInteractions(scene, world.hazards);
  createLighting(scene);
  createRain(scene);
}

export function updateLevel1(scene: Level1) {
  updateLighting(scene);

  if (scene.isDead) {
    return;
  }

  updatePlayer(scene);
  if (scene.isDead) {
    return;
  }

  updateEnemies(scene);
  if (scene.isDead) {
    return;
  }

  scene.combatManager.update();
  revealHiddenHazards(scene);
  updateComboCounter(scene);

  if (!scene.isDead) {
    scene.cameraController.update();
  }
}
