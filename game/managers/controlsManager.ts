import Phaser from "phaser";

import type Level1 from "@/game/scenes/Level1";

const SPACE_DOUBLE_TAP_MS = 250;

type ControlKeyMap = {
  A: Phaser.Input.Keyboard.Key;
  D: Phaser.Input.Keyboard.Key;
  W: Phaser.Input.Keyboard.Key;
  S: Phaser.Input.Keyboard.Key;
  SPACE: Phaser.Input.Keyboard.Key;
  SHIFT: Phaser.Input.Keyboard.Key;
  Q: Phaser.Input.Keyboard.Key;
  E: Phaser.Input.Keyboard.Key;
};

export type ControlsState = {
  leftDown: boolean;
  rightDown: boolean;
  upDown: boolean;
  downDown: boolean;
  jumpHeld: boolean;
  jumpPressed: boolean;
  flipPressed: boolean;
  dashPressed: boolean;
  attackPressed: boolean;
  parryPressed: boolean;
  secondaryWeaponPressed: boolean;
  interactPressed: boolean;
};

const EMPTY_STATE: ControlsState = {
  leftDown: false,
  rightDown: false,
  upDown: false,
  downDown: false,
  jumpHeld: false,
  jumpPressed: false,
  flipPressed: false,
  dashPressed: false,
  attackPressed: false,
  parryPressed: false,
  secondaryWeaponPressed: false,
  interactPressed: false,
};

export default class ControlsManager {
  private readonly scene: Level1;
  private readonly keys: ControlKeyMap;

  private readonly handlePointerDown: (pointer: Phaser.Input.Pointer) => void;
  private readonly handleContextMenu: (event: MouseEvent) => void;

  private state: ControlsState = { ...EMPTY_STATE };
  private pendingAttackPressed = false;
  private pendingParryPressed = false;
  private lastSpaceTapAt = -Infinity;

  constructor(scene: Level1) {
    this.scene = scene;
    this.keys = scene.input.keyboard!.addKeys(
      "A,D,W,S,SPACE,SHIFT,Q,E",
    ) as ControlKeyMap;

    scene.input.mouse?.disableContextMenu();

    this.handlePointerDown = (pointer) => {
      if (pointer.button === 0 || pointer.leftButtonDown()) {
        this.pendingAttackPressed = true;
        return;
      }

      if (pointer.button === 2 || pointer.rightButtonDown()) {
        this.pendingParryPressed = true;
      }
    };

    this.handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    scene.input.on("pointerdown", this.handlePointerDown);
    scene.game.canvas.addEventListener("contextmenu", this.handleContextMenu);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.destroy();
    });
  }

  update() {
    const now = this.scene.time.now;
    const jumpPressed = Phaser.Input.Keyboard.JustDown(this.keys.SPACE);
    const flipPressed = jumpPressed && now - this.lastSpaceTapAt <= SPACE_DOUBLE_TAP_MS;

    if (jumpPressed) {
      this.lastSpaceTapAt = now;
    }

    this.state = {
      leftDown: this.keys.A.isDown,
      rightDown: this.keys.D.isDown,
      upDown: this.keys.W.isDown,
      downDown: this.keys.S.isDown,
      jumpHeld: this.keys.SPACE.isDown,
      jumpPressed,
      flipPressed,
      dashPressed: Phaser.Input.Keyboard.JustDown(this.keys.SHIFT),
      attackPressed: this.pendingAttackPressed,
      parryPressed: this.pendingParryPressed,
      secondaryWeaponPressed: Phaser.Input.Keyboard.JustDown(this.keys.Q),
      interactPressed: Phaser.Input.Keyboard.JustDown(this.keys.E),
    };

    if (flipPressed) {
      this.lastSpaceTapAt = -Infinity;
    }

    this.pendingAttackPressed = false;
    this.pendingParryPressed = false;
  }

  destroy() {
    this.scene.input.off("pointerdown", this.handlePointerDown);
    this.scene.game.canvas.removeEventListener("contextmenu", this.handleContextMenu);
  }

  get leftDown() {
    return this.state.leftDown;
  }

  get rightDown() {
    return this.state.rightDown;
  }

  get upDown() {
    return this.state.upDown;
  }

  get downDown() {
    return this.state.downDown;
  }

  get jumpHeld() {
    return this.state.jumpHeld;
  }

  get jumpPressed() {
    return this.state.jumpPressed;
  }

  get flipPressed() {
    return this.state.flipPressed;
  }

  get dashPressed() {
    return this.state.dashPressed;
  }

  get attackPressed() {
    return this.state.attackPressed;
  }

  get parryPressed() {
    return this.state.parryPressed;
  }

  get secondaryWeaponPressed() {
    return this.state.secondaryWeaponPressed;
  }

  get interactPressed() {
    return this.state.interactPressed;
  }
}
