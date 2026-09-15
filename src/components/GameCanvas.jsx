import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
} from "../game/constants.js";

import { GameRenderer } from "../game/renderer.js";

const GameCanvas = forwardRef(function GameCanvas(
  { engine, snapshot },
  ref
) {
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);

  useImperativeHandle(
    ref,
    () => ({
      focus() {
        canvasRef.current?.focus();
      },
    }),
    []
  );

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      console.error(
        "Não foi possível obter o contexto 2D do Canvas."
      );
      return;
    }

    ctx.imageSmoothingEnabled = false;

    const renderer = new GameRenderer(
      ctx,
      () => {
        // O robot.png terminou de carregar.
        // Renderizamos novamente para garantir
        // que ele apareça sem desaparecer.
        renderer.render(engine);
      }
    );

    rendererRef.current = renderer;

    renderer.render(engine);

    return () => {
      rendererRef.current = null;
    };
  }, [engine]);

  useEffect(() => {
    rendererRef.current?.render(engine);
  }, [engine, snapshot]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      tabIndex={0}
      aria-label="Jogo PODA"
      className="poda-canvas"
    />
  );
});

export default GameCanvas;