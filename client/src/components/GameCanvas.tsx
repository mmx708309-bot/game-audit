// أسلوب «مسرح الاختيارات»: Babylon يرسم كواليس كحلية متحركة، وواجهة اللعبة العربية تظهر فوقها.

import { useEffect, useRef } from "react";
import { Engine } from "@babylonjs/core/Engines/engine";
import { createGameScene, type GameHandle } from "@/game/scene";
import GameShell from "@/components/GameShell";

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || startedRef.current) return;
    startedRef.current = true;

    const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, adaptToDeviceRatio: true });
    let handle: GameHandle | null = null;
    let active = true;

    createGameScene(engine, canvas).then((gameHandle) => {
      if (!active) {
        gameHandle.dispose();
        return;
      }
      handle = gameHandle;
      engine.runRenderLoop(() => gameHandle.scene.render());
    });

    const onResize = () => engine.resize();
    window.addEventListener("resize", onResize);
    return () => {
      active = false;
      window.removeEventListener("resize", onResize);
      handle?.dispose();
      engine.dispose();
      startedRef.current = false;
    };
  }, []);

  return (
    <div className="game-root" dir="rtl">
      <canvas ref={canvasRef} className="game-canvas" style={{ touchAction: "none" }} />
      <GameShell />
    </div>
  );
}
