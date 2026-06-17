"use client";

import { useEffect, useRef, useState } from "react";
import type Phaser from "phaser";

type PhaserModule = typeof import("phaser");
type SceneClass = new () => Phaser.Scene;

export default function GameCanvas() {
  const gameRef = useRef<HTMLDivElement>(null);
  const [phaserModule, setPhaserModule] = useState<PhaserModule | null>(null);
  const [sceneClass, setSceneClass] = useState<SceneClass | null>(null);

  useEffect(() => {
    // Dynamically import Phaser and the scene only on the client side.
    Promise.all([import("phaser"), import("../game/scenes/Level1")]).then(([phaserMod, sceneMod]) => {
      const resolvedPhaser = (phaserMod as unknown as { default?: PhaserModule }).default ?? phaserMod;
      setPhaserModule(resolvedPhaser);
      setSceneClass(() => sceneMod.default);
    });
  }, []);

  useEffect(() => {
    if (!gameRef.current || !phaserModule || !sceneClass) return;

    const game = new phaserModule.Game({
      type: phaserModule.AUTO,
      width: 960,
      height: 540,
      parent: gameRef.current,
      backgroundColor: "#0f172a",
      scale: {
        mode: phaserModule.Scale.FIT,
        autoCenter: phaserModule.Scale.CENTER_BOTH
      },
      physics: {
        default: "arcade",
        arcade: {
          gravity: { x: 0, y: 1200 },
          debug: false,
        },
      },
      scene: sceneClass,
    });

    return () => {
      game.destroy(true);
    };
  }, [phaserModule, sceneClass]);

  return <div ref={gameRef} />;
}
