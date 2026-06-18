"use client";

import { useEffect, useRef } from "react";

import {
  createGameConfig,
  type PhaserModule,
} from "@/game/managers/phaserConfig";

export default function GameCanvas() {
  const gameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isDisposed = false;
    let game: import("phaser").Game | null = null;

    const mountGame = async () => {
      if (!gameRef.current) {
        return;
      }

      const [phaserImport, sceneImport] = await Promise.all([
        import("phaser"),
        import("@/game/scenes/Level1"),
      ]);
      const phaserModule =
        (phaserImport as { default?: PhaserModule }).default ?? phaserImport;

      if (isDisposed || !gameRef.current) {
        return;
      }

      game = new phaserModule.Game(
        createGameConfig(phaserModule, gameRef.current, sceneImport.default),
      );
    };

    void mountGame();

    return () => {
      isDisposed = true;
      game?.destroy(true);
    };
  }, []);

  return <div ref={gameRef} />;
}
