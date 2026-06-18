import type Level1 from "@/game/scenes/Level1";
import type { SFXType } from "@/game/managers/level1Types";

export function setupBackgroundMusic(scene: Level1) {
  const existingMusic = scene.sound.get("bg_music");
  if (existingMusic) {
    scene.backgroundMusic = existingMusic;
  } else {
    scene.backgroundMusic = scene.sound.add("bg_music", {
      loop: true,
      volume: 0.25,
    });
  }

  const startMusic = () => {
    if (!scene.backgroundMusic) {
      return;
    }

    if (scene.backgroundMusic.isPlaying) {
      return;
    }

    if (scene.backgroundMusic.isPaused) {
      scene.backgroundMusic.resume();
      return;
    }

    scene.backgroundMusic.play({
      loop: true,
      volume: 0.25,
    });
  };

  if (!scene.sound.locked) {
    startMusic();
  }

  scene.input.once("pointerdown", startMusic);
  scene.input.keyboard?.once("keydown", startMusic);
}

export function playSFX(scene: Level1, type: SFXType) {
  try {
    if (type === "coin") {
      scene.sound.play("coin_pickup", {
        volume: 0.35,
      });
      return;
    }

    if (type === "key") {
      scene.sound.play("key_pickup", {
        volume: 0.35,
      });
      return;
    }

    if (type === "punch") {
      scene.sound.play("arcade_punch", {
        volume: 0.35,
      });
      return;
    }

    if (!scene.audioCtx) {
      const audioWindow = window as Window & typeof globalThis & {
        webkitAudioContext?: typeof AudioContext;
      };
      const AudioContextClass =
        audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
      if (!AudioContextClass) {
        return;
      }
      scene.audioCtx = new AudioContextClass();
    }

    const ctx = scene.audioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === "parry") {
      osc.type = "square";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.03);
      osc.frequency.exponentialRampToValueAtTime(480, now + 0.16);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);
      osc.start(now);
      osc.stop(now + 0.16);
    } else if (type === "slash") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(720, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.08);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === "jump") {
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
  } catch (error) {
    console.warn("SFX failed", error);
  }
}
