import { useCallback, useEffect, useRef, useState } from "react";
import { GameEngine } from "./game/GameEngine.js";
import GameCanvas from "./components/GameCanvas.jsx";
import HUD from "./components/HUD.jsx";
import Controls from "./components/Controls.jsx";
import "./styles/index.css";

function App() {
  const engineRef = useRef(null);
  const canvasRef = useRef(null);

  if (!engineRef.current) {
    engineRef.current = new GameEngine();
  }

  const engine = engineRef.current;

  const [snapshot, setSnapshot] = useState(() => engine.getSnapshot());

  useEffect(() => {
    const unsubscribe = engine.subscribe((nextSnapshot) => {
      setSnapshot(nextSnapshot);
    });

    setSnapshot(engine.getSnapshot());

    return unsubscribe;
  }, [engine]);

  const move = useCallback(
    (dx, dy) => {
      engine.move(dx, dy);
      canvasRef.current?.focus();
    },
    [engine]
  );

  const prune = useCallback(() => {
    engine.pruneAdjacent();
    canvasRef.current?.focus();
  }, [engine]);

  const restart = useCallback(() => {
    engine.reset();
    canvasRef.current?.focus();
  }, [engine]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === " " || event.key === "Spacebar") {
        event.preventDefault();
        prune();
        return;
      }

      const directions = {
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
      };

      const direction = directions[event.key];

      if (!direction) return;

      event.preventDefault();
      move(direction[0], direction[1]);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [move, prune]);

  return (
    <main className="poda-app">
      <header className="poda-header">
        <div>
          <p className="poda-kicker">2D GRID PUZZLE</p>

          <h1 className="poda-title">PODA</h1>

          <p className="poda-subtitle">
            Corte a planta. Preserve a conexão. Alcance o GEM.
          </p>
        </div>

        <div className="graph-indicator">
          <span className="graph-dot" />
          GRAPH ENGINE
          <span className="graph-status">
            {snapshot.graphValidation ? "VALID" : "INVALID"}
          </span>
        </div>
      </header>

      <section className="game-panel">
        <HUD snapshot={snapshot} />

        <div className="game-frame">
          <GameCanvas
            ref={canvasRef}
            engine={engine}
            snapshot={snapshot}
          />

          {snapshot.victory && (
            <div className="victory-overlay">
              <div className="victory-panel">
                <p className="victory-kicker">
                  CONEXÃO ESTABELECIDA
                </p>

                <h2>VITÓRIA</h2>

                <p>A planta alcançou o GEM.</p>

                <div className="victory-score">
                  PODA: {snapshot.score}
                </div>

                <button
                  type="button"
                  className="restart-button"
                  onClick={restart}
                >
                  JOGAR NOVAMENTE
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="game-message">
          <span className="message-label">STATUS</span>
          <span>{snapshot.message}</span>
        </div>

        <Controls
          onMove={move}
          onPrune={prune}
          onRestart={restart}
        />

        <div className="graph-debug">
          <span>
            NÓS DA PLANTA: <strong>{snapshot.plantCount}</strong>
          </span>

          <span>
            ROOT:{" "}
            <strong>
              {snapshot.root.x},{snapshot.root.y}
            </strong>
          </span>

          <span>
            GEM:{" "}
            <strong>
              {snapshot.gem.x},{snapshot.gem.y}
            </strong>
          </span>
        </div>
      </section>

      <footer className="poda-footer">
        <span>SETAS — MOVER</span>
        <span>ESPAÇO — PODAR</span>
        <span>GRAPH / BFS</span>
      </footer>
    </main>
  );
}

export default App;