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
    this.robotCanvas = null;

    this.onAssetLoaded = onAssetLoaded;

    this.robotImage.onload = () => {
      this.prepareRobotImage();
    };

    this.robotImage.onerror = () => {
      this.robotLoaded = false;

      console.warn(
        `Não foi possível carregar o robô: ${ROBOT_ASSET}`
      );
    };

    this.robotImage.src = ROBOT_ASSET;
  }

  // ============================================================
  // ROBOT IMAGE PREPARATION
  // ============================================================

  prepareRobotImage() {
    const width = this.robotImage.naturalWidth;
    const height = this.robotImage.naturalHeight;

    if (!width || !height) {
      this.robotLoaded = false;
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d", {
      willReadFrequently: true,
    });

    if (!ctx) {
      this.robotLoaded = false;
      return;
    }

    ctx.imageSmoothingEnabled = false;

    ctx.drawImage(
      this.robotImage,
      0,
      0
    );

    const imageData = ctx.getImageData(
      0,
      0,
      width,
      height
    );

    const data = imageData.data;

    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    // Procura somente pixels visíveis.
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index =
          (y * width + x) * 4;

        const alpha = data[index + 3];

        if (alpha > 10) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }

    // Nenhum pixel visível.
    if (
      maxX < 0 ||
      maxY < 0
    ) {
      this.robotLoaded = false;
      return;
    }

    const padding = 1;

    minX = Math.max(
      0,
      minX - padding
    );

    minY = Math.max(
      0,
      minY - padding
    );

    maxX = Math.min(
      width - 1,
      maxX + padding
    );

    maxY = Math.min(
      height - 1,
      maxY + padding
    );

    const cropWidth =
      maxX - minX + 1;

    const cropHeight =
      maxY - minY + 1;

    const cropped =
      document.createElement("canvas");

    cropped.width = cropWidth;
    cropped.height = cropHeight;

    const croppedCtx =
      cropped.getContext("2d");

    if (!croppedCtx) {
      this.robotLoaded = false;
      return;
    }

    croppedCtx.imageSmoothingEnabled =
      false;

    croppedCtx.drawImage(
      canvas,
      minX,
      minY,
      cropWidth,
      cropHeight,
      0,
      0,
      cropWidth,
      cropHeight
    );

    this.robotCanvas = cropped;
    this.robotLoaded = true;

    if (this.onAssetLoaded) {
      this.onAssetLoaded();
    }
  }

  // ============================================================
  // MAIN RENDER
  // ============================================================

  render(engine) {
    const snapshot =
      engine.getSnapshot();

    const { ctx } = this;

    ctx.imageSmoothingEnabled =
      false;

    ctx.clearRect(
      0,
      0,
      COLS * TILE,
      ROWS * TILE
    );

    this.drawBackground();

    this.drawGrid(snapshot);

    this.drawPlantConnections(
      snapshot
    );

    this.drawGem(
      snapshot.gem
    );

    this.drawRobot(
      snapshot.player
    );
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
        const type =
          snapshot.grid[y][x];

        switch (type) {
          case TYPE.WALL:
            this.drawWall(x, y);
            break;

          case TYPE.ROOT:
            this.drawRoot(x, y);
            break;

          case TYPE.PLANT:
            this.drawPlantNode(
              x,
              y,
              false
            );
            break;

          case TYPE.POWERED:
            this.drawPlantNode(
              x,
              y,
              true
            );
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
      const px =
        x * TILE + 0.5;

      ctx.beginPath();

      ctx.moveTo(px, 0);

      ctx.lineTo(
        px,
        ROWS * TILE
      );

      ctx.stroke();
    }

    for (let y = 0; y <= ROWS; y++) {
      const py =
        y * TILE + 0.5;

      ctx.beginPath();

      ctx.moveTo(
        0,
        py
      );

      ctx.lineTo(
        COLS * TILE,
        py
      );

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

    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 6;
    ctx.lineCap = "square";

    ctx.beginPath();

    ctx.moveTo(
      centerX,
      centerY
    );

    ctx.lineTo(
      centerX - 14,
      centerY
    );

    ctx.moveTo(
      centerX,
      centerY
    );

    ctx.lineTo(
      centerX + 14,
      centerY
    );

    ctx.moveTo(
      centerX,
      centerY
    );

    ctx.lineTo(
      centerX,
      centerY - 14
    );

    ctx.moveTo(
      centerX,
      centerY
    );

    ctx.lineTo(
      centerX,
      centerY + 14
    );

    ctx.stroke();

    // Ramificações secundárias
    ctx.lineWidth = 3;

    ctx.beginPath();

    ctx.moveTo(
      centerX - 7,
      centerY
    );

    ctx.lineTo(
      centerX - 13,
      centerY - 7
    );

    ctx.moveTo(
      centerX + 7,
      centerY
    );

    ctx.lineTo(
      centerX + 13,
      centerY + 7
    );

    ctx.moveTo(
      centerX,
      centerY + 7
    );

    ctx.lineTo(
      centerX - 7,
      centerY + 13
    );

    ctx.stroke();

    // Núcleo
    ctx.fillStyle = "#fff";

    ctx.fillRect(
      centerX - 6,
      centerY - 6,
      12,
      12
    );

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
    if (
      !snapshot ||
      !snapshot.connectedNodes
    ) {
      return;
    }

    const entries =
      snapshot.graphEntries;

    if (!entries) {
      return;
    }

    for (const [
      from,
      neighbors,
    ] of entries) {
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

        const powered =
          snapshot.connectedNodes.has(
            from
          ) &&
          snapshot.connectedNodes.has(
            to
          );

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

    ctx.strokeStyle =
      powered
        ? "#fff"
        : "#555";

    ctx.lineWidth =
      powered
        ? 6
        : 4;

    ctx.lineCap =
      "square";

    ctx.beginPath();

    ctx.moveTo(
      x1,
      y1
    );

    ctx.lineTo(
      x2,
      y2
    );

    ctx.stroke();
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

    const color =
      powered
        ? "#fff"
        : "#666";

    // Folha esquerda
    ctx.fillStyle =
      color;

    ctx.fillRect(
      centerX - 12,
      centerY - 3,
      8,
      5
    );

    // Folha direita
    ctx.fillRect(
      centerX + 4,
      centerY - 3,
      8,
      5
    );

    // Nó
    ctx.fillRect(
      centerX - 6,
      centerY - 6,
      12,
      12
    );

    // Núcleo
    ctx.fillStyle =
      powered
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
      centerX - 16,
      centerY - 16,
      32,
      32
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

    // Fallback
    this.drawRobotFallback(
      centerX,
      centerY
    );

    if (
      !this.robotLoaded ||
      !this.robotCanvas
    ) {
      return;
    }

    const imageWidth =
      this.robotCanvas.width;

    const imageHeight =
      this.robotCanvas.height;

    /*
     * Agora o tamanho é calculado
     * sobre o personagem recortado,
     * e não sobre o PNG inteiro.
     */

    const maxWidth =
      TILE * 1.05;

    const maxHeight =
      TILE * 1.05;

    const scale =
      Math.min(
        maxWidth / imageWidth,
        maxHeight / imageHeight
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
      this.robotCanvas,
      drawX,
      drawY,
      width,
      height
    );
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

    ctx.fillRect(
      Math.round(
        centerX - 7
      ),
      Math.round(
        centerY - 6
      ),
      4,
      4
    );

    ctx.fillRect(
      Math.round(
        centerX + 3
      ),
      Math.round(
        centerY - 6
      ),
      4,
      4
    );

    ctx.fillRect(
      Math.round(
        centerX - 6
      ),
      Math.round(
        centerY + 5
      ),
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
