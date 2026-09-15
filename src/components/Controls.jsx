export default function Controls({
  onMove,
  onPrune,
  onRestart
}) {
  return (
    <div className="controls">
      <button
        type="button"
        onClick={() => onMove(0, -1)}
        className="control-button"
        aria-label="Mover para cima"
      >
        ↑
      </button>

      <div className="controls-row">
        <button
          type="button"
          onClick={() => onMove(-1, 0)}
          className="control-button"
          aria-label="Mover para esquerda"
        >
          ←
        </button>

        <button
          type="button"
          onClick={() => onMove(0, 1)}
          className="control-button"
          aria-label="Mover para baixo"
        >
          ↓
        </button>

        <button
          type="button"
          onClick={() => onMove(1, 0)}
          className="control-button"
          aria-label="Mover para direita"
        >
          →
        </button>
      </div>

      <button
        type="button"
        onClick={onPrune}
        className="prune-button"
      >
        PODAR — ESPAÇO
      </button>

      <button
        type="button"
        onClick={onRestart}
        className="restart-button"
      >
        REINICIAR
      </button>
    </div>
  );
}