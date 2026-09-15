export default function HUD({
  snapshot
}) {
  const status =
    snapshot.victory
      ? "VITÓRIA"
      : snapshot.gameOver
        ? "FIM"
        : "ATIVO";

  return (
    <div className="poda-hud">
      <div>
        PONTOS:
        <strong>
          {snapshot.score}
        </strong>
      </div>

      <div
        className={
          snapshot.victory
            ? "status-victory"
            : ""
        }
      >
        {status}
      </div>

      <div>
        PLANTA:
        <strong>
          {snapshot.plantCount}
        </strong>
      </div>
    </div>
  );
}