import {
  COLS,
  ROWS,
  TILE,
  TYPE,
  ROBOT_ASSET,
} from "./constants.js";

export class GameRenderer {
  constructor(ctx, onAssetLoaded = null) {
    this.ctx = ctx;

    this.robotImage = new Image();
    this.robotLoaded = false;
    this.onAssetLoaded = onAssetLoaded;

    this.robotImage.onload = () => {
      this.robotLoaded = true;

      if (this.onAssetLoaded) {
        this.onAssetLoaded();
      }
    };

    this.robotImage.onerror = () => {
      this.robotLoaded = false;

      console.warn(
        `Não foi possível carregar o robô: ${ROBOT_ASSET}`
      );
    };

    this.robotImage.src = ROBOT_ASSET;
  }

  render(engine) {
    const snapshot = engine.getSnapshot();
    const { ctx } = this;

    ctx.imageSmoothingEnabled = false;

    ctx.clearRect(
      0,
      0,
      COLS * TILE,
      ROWS * TILE
    );

    this.drawBackground();
    this.drawGrid(snapshot);
    this.drawPlantConnections(snapshot);
    this.drawGem(snapshot.gem);
    this.drawRobot(snapshot.player);
  }

  // ============================================================
  // BACKGROUND
  // ============================================================

  drawBackground() {
    const { ctx } = this;

    ctx.fillStyle = "#050505";

    ctx.fillRect(
      0,
      0,
      COLS * TILE,
      ROWS * TILE
    );
  }

  // ============================================================
  // GRID
  // ============================================================

  drawGrid(snapshot) {
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const type = snapshot.grid[y][x];

        switch (type) {
          case TYPE.WALL:
            this.drawWall(x, y);
            break;

          case TYPE.ROOT:
            this.drawRoot(x, y);
            break;

          case TYPE.PLANT:
            this.drawPlantNode(x, y, false);
            break;

          case TYPE.POWERED:
            this.drawPlantNode(x, y, true);
            break;

          default:
            break;
        }
      }
    }

    this.drawGridLines();
  }

  drawGridLines() {
    const { ctx } = this;

    ctx.strokeStyle = "#101010";
    ctx.lineWidth = 1;

    for (let x = 0; x <= COLS; x++) {
      const px = x * TILE + 0.5;

      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, ROWS * TILE);
      ctx.stroke();
    }

    for (let y = 0; y <= ROWS; y++) {
      const py = y * TILE + 0.5;

      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(COLS * TILE, py);
      ctx.stroke();
    }
  }

  // ============================================================
  // WALL
  // ============================================================

  drawWall(x, y) {
    const { ctx } = this;

    const px = x * TILE;
    const py = y * TILE;

    ctx.fillStyle = "#151515";

    ctx.fillRect(
      px,
      py,
      TILE,
      TILE
    );

    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;

    ctx.strokeRect(
      px + 1,
      py + 1,
      TILE - 2,
      TILE - 2
    );

    // Detalhes pixelados
    ctx.fillStyle = "#242424";

    ctx.fillRect(
      px + 6,
      py + 7,
      8,
      3
    );

    ctx.fillRect(
      px + 24,
      py + 22,
      9,
      3
    );

    ctx.fillRect(
      px + 12,
      py + 31,
      5,
      2
    );
  }

  // ============================================================
  // ROOT
  // ============================================================

  drawRoot(x, y) {
    const { ctx } = this;

    const centerX =
      x * TILE + TILE / 2;

    const centerY =
      y * TILE + TILE / 2;

    // Raízes principais
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 5;
    ctx.lineCap = "square";

    ctx.beginPath();

    ctx.moveTo(
      centerX,
      centerY
    );

    ctx.lineTo(
      centerX - 13,
      centerY
    );

    ctx.moveTo(
      centerX,
      centerY
    );

    ctx.lineTo(
      centerX + 13,
      centerY
    );

    ctx.moveTo(
      centerX,
      centerY
    );

    ctx.lineTo(
      centerX,
      centerY - 13
    );

    ctx.moveTo(
      centerX,
      centerY
    );

    ctx.lineTo(
      centerX,
      centerY + 13
    );

    ctx.stroke();

    // Ramificações menores
    ctx.lineWidth = 2;

    ctx.beginPath();

    ctx.moveTo(
      centerX - 7,
      centerY
    );

    ctx.lineTo(
      centerX - 12,
      centerY - 6
    );

    ctx.moveTo(
      centerX + 7,
      centerY
    );

    ctx.lineTo(
      centerX + 12,
      centerY + 6
    );

    ctx.moveTo(
      centerX,
      centerY + 7
    );

    ctx.lineTo(
      centerX - 6,
      centerY + 12
    );

    ctx.stroke();

    // Núcleo
    ctx.fillStyle = "#fff";

    ctx.fillRect(
      centerX - 5,
      centerY - 5,
      10,
      10
    );

    // Centro
    ctx.fillStyle = "#000";

    ctx.fillRect(
      centerX - 2,
      centerY - 2,
      4,
      4
    );
  }

  // ============================================================
  // PLANT CONNECTIONS
  // ============================================================

  drawPlantConnections(snapshot) {
    if (!snapshot?.connectedNodes) {
      return;
    }

    const entries =
      snapshot.graphEntries;

    if (!entries) {
      return;
    }

    /*
     * O Graph é direcional:
     *
     * pai -> filho
     *
     * O renderer apenas desenha as
     * conexões existentes.
     *
     * Ele não cria novas conexões.
     */

    for (const [from, neighbors] of entries) {
      const fromPosition =
        this.keyToPosition(from);

      if (!fromPosition) {
        continue;
      }

      for (const to of neighbors) {
        const toPosition =
          this.keyToPosition(to);

        if (!toPosition) {
          continue;
        }

        const fromConnected =
          snapshot.connectedNodes.has(from);

        const toConnected =
          snapshot.connectedNodes.has(to);

        const powered =
          fromConnected &&
          toConnected;

        this.drawBranchSegment(
          fromPosition,
          toPosition,
          powered
        );
      }
    }
  }

  drawBranchSegment(
    from,
    to,
    powered
  ) {
    const { ctx } = this;

    const x1 =
      from.x * TILE +
      TILE / 2;

    const y1 =
      from.y * TILE +
      TILE / 2;

    const x2 =
      to.x * TILE +
      TILE / 2;

    const y2 =
      to.y * TILE +
      TILE / 2;

    ctx.strokeStyle = powered
      ? "#fff"
      : "#555";

    ctx.lineWidth = powered
      ? 6
      : 4;

    ctx.lineCap = "square";

    ctx.beginPath();

    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);

    ctx.stroke();

    // Pequeno nó central
    ctx.fillStyle = powered
      ? "#fff"
      : "#666";

    const centerX =
      Math.round(
        (x1 + x2) / 2
      );

    const centerY =
      Math.round(
        (y1 + y2) / 2
      );

    ctx.fillRect(
      centerX - 2,
      centerY - 2,
      4,
      4
    );
  }

  // ============================================================
  // PLANT NODE
  // ============================================================

  drawPlantNode(
    x,
    y,
    powered
  ) {
    const { ctx } = this;

    const centerX =
      x * TILE +
      TILE / 2;

    const centerY =
      y * TILE +
      TILE / 2;

    const color = powered
      ? "#fff"
      : "#666";

    // Folha esquerda
    ctx.fillStyle = color;

    ctx.fillRect(
      centerX - 11,
      centerY - 3,
      7,
      5
    );

    // Folha direita
    ctx.fillRect(
      centerX + 4,
      centerY - 3,
      7,
      5
    );

    // Nó principal
    ctx.fillRect(
      centerX - 6,
      centerY - 6,
      12,
      12
    );

    // Núcleo
    ctx.fillStyle = powered
      ? "#000"
      : "#222";

    ctx.fillRect(
      centerX - 2,
      centerY - 2,
      4,
      4
    );
  }

  // ============================================================
  // GEM
  // ============================================================

  drawGem(position) {
    if (!position) {
      return;
    }

    const { ctx } = this;

    const centerX =
      position.x * TILE +
      TILE / 2;

    const centerY =
      position.y * TILE +
      TILE / 2;

    // Aura
    ctx.fillStyle = "#222";

    ctx.fillRect(
      centerX - 15,
      centerY - 15,
      30,
      30
    );

    // Diamante
    ctx.fillStyle = "#fff";

    ctx.beginPath();

    ctx.moveTo(
      centerX,
      centerY - 14
    );

    ctx.lineTo(
      centerX + 11,
      centerY
    );

    ctx.lineTo(
      centerX,
      centerY + 14
    );

    ctx.lineTo(
      centerX - 11,
      centerY
    );

    ctx.closePath();

    ctx.fill();

    // Interior
    ctx.fillStyle = "#000";

    ctx.beginPath();

    ctx.moveTo(
      centerX,
      centerY - 7
    );

    ctx.lineTo(
      centerX + 5,
      centerY
    );

    ctx.lineTo(
      centerX,
      centerY + 7
    );

    ctx.lineTo(
      centerX - 5,
      centerY
    );

    ctx.closePath();

    ctx.fill();

    // Brilho
    ctx.fillStyle = "#fff";

    ctx.fillRect(
      centerX - 2,
      centerY - 9,
      4,
      3
    );
  }

  // ============================================================
  // ROBOT
  // ============================================================

  drawRobot(position) {
    if (!position) {
      return;
    }

    if (
      !Number.isFinite(position.x) ||
      !Number.isFinite(position.y)
    ) {
      return;
    }

    const { ctx } = this;

    const centerX =
      position.x * TILE +
      TILE / 2;

    const centerY =
      position.y * TILE +
      TILE / 2;

    /*
     * Fallback primeiro.
     *
     * Isso evita que o robô desapareça
     * enquanto robot.png carrega.
     */

    this.drawRobotFallback(
      centerX,
      centerY
    );

    if (
      this.robotLoaded &&
      this.robotImage.complete &&
      this.robotImage.naturalWidth > 0 &&
      this.robotImage.naturalHeight > 0
    ) {
      const maxSize =
        TILE * 0.78;

      const imageWidth =
        this.robotImage.naturalWidth;

      const imageHeight =
        this.robotImage.naturalHeight;

      const scale =
        Math.min(
          maxSize / imageWidth,
          maxSize / imageHeight
        );

      const width =
        Math.max(
          1,
          Math.round(
            imageWidth * scale
          )
        );

      const height =
        Math.max(
          1,
          Math.round(
            imageHeight * scale
          )
        );

      const drawX =
        Math.round(
          centerX - width / 2
        );

      const drawY =
        Math.round(
          centerY - height / 2
        );

      ctx.imageSmoothingEnabled =
        false;

      ctx.drawImage(
        this.robotImage,
        drawX,
        drawY,
        width,
        height
      );
    }
  }

  drawRobotFallback(
    centerX,
    centerY
  ) {
    const { ctx } = this;

    const width = 24;
    const height = 26;

    ctx.fillStyle = "#fff";

    ctx.fillRect(
      Math.round(
        centerX - width / 2
      ),
      Math.round(
        centerY - height / 2
      ),
      width,
      height
    );

    ctx.fillStyle = "#000";

    // Olho esquerdo
    ctx.fillRect(
      Math.round(centerX - 7),
      Math.round(centerY - 6),
      4,
      4
    );

    // Olho direito
    ctx.fillRect(
      Math.round(centerX + 3),
      Math.round(centerY - 6),
      4,
      4
    );

    // Boca
    ctx.fillRect(
      Math.round(centerX - 6),
      Math.round(centerY + 5),
      12,
      2
    );
  }

  // ============================================================
  // UTILS
  // ============================================================

  keyToPosition(key) {
    if (typeof key !== "string") {
      return null;
    }

    const [x, y] =
      key.split(",").map(Number);

    if (
      !Number.isInteger(x) ||
      !Number.isInteger(y)
    ) {
      return null;
    }

    return {
      x,
      y,
    };
  }
}
