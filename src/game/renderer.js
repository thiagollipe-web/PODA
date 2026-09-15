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

  prepareRobotImage() {
    const width = this.robotImage.naturalWidth;
    const height = this.robotImage.naturalHeight;

    if (!width || !height) {
      this.robotLoaded = false;
      return;
    }

    const source = document.createElement("canvas");
    source.width = width;
    source.height = height;

    const sourceCtx = source.getContext("2d", {
      willReadFrequently: true,
    });

    if (!sourceCtx) {
      this.robotLoaded = false;
      return;
    }

    sourceCtx.imageSmoothingEnabled = false;
    sourceCtx.drawImage(this.robotImage, 0, 0);

    const imageData = sourceCtx.getImageData(
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

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;

        if (data[index + 3] > 10) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }

    if (maxX < 0 || maxY < 0) {
      this.robotLoaded = false;
      return;
    }

    const padding = 1;

    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(width - 1, maxX + padding);
    maxY = Math.min(height - 1, maxY + padding);

    const cropWidth = maxX - minX + 1;
    const cropHeight = maxY - minY + 1;

    const cropped = document.createElement("canvas");
    cropped.width = cropWidth;
    cropped.height = cropHeight;

    const croppedCtx = cropped.getContext("2d");

    if (!croppedCtx) {
      this.robotLoaded = false;
      return;
    }

    croppedCtx.imageSmoothingEnabled = false;

    croppedCtx.drawImage(
      source,
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

    ctx.fillStyle = "#030303";

    ctx.fillRect(
      0,
      0,
      COLS * TILE,
      ROWS * TILE
    );

    // Pequenos pontos de textura
    ctx.fillStyle = "#0b0b0b";

    for (let y = 1; y < ROWS - 1; y++) {
      for (let x = 1; x < COLS - 1; x++) {
        if ((x * 7 + y * 11) % 13 === 0) {
          ctx.fillRect(
            x * TILE + 7,
            y * TILE + 9,
            2,
            2
          );
        }
      }
    }
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

    ctx.strokeStyle = "#0d0d0d";
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

    ctx.fillStyle = "#171717";
    ctx.fillRect(px, py, TILE, TILE);

    ctx.strokeStyle = "#3a3a3a";
    ctx.lineWidth = 2;

    ctx.strokeRect(
      px + 1,
      py + 1,
      TILE - 2,
      TILE - 2
    );

    ctx.fillStyle = "#292929";

    ctx.fillRect(px + 6, py + 7, 8, 3);
    ctx.fillRect(px + 24, py + 22, 9, 3);
    ctx.fillRect(px + 12, py + 31, 5, 2);
  }

  // ============================================================
  // ROOT
  // ============================================================

  drawRoot(x, y) {
    const { ctx } = this;

    const cx = x * TILE + TILE / 2;
    const cy = y * TILE + TILE / 2;

    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 7;
    ctx.lineCap = "square";

    // Raízes principais
    ctx.beginPath();

    ctx.moveTo(cx, cy);
    ctx.lineTo(cx - 15, cy);

    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + 15, cy);

    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, cy - 15);

    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, cy + 15);

    ctx.stroke();

    // Raízes secundárias
    ctx.lineWidth = 3;

    ctx.beginPath();

    ctx.moveTo(cx - 7, cy);
    ctx.lineTo(cx - 14, cy - 7);

    ctx.moveTo(cx + 7, cy);
    ctx.lineTo(cx + 14, cy + 7);

    ctx.moveTo(cx, cy + 7);
    ctx.lineTo(cx - 7, cy + 14);

    ctx.moveTo(cx, cy - 7);
    ctx.lineTo(cx + 7, cy - 14);

    ctx.stroke();

    // Núcleo
    ctx.fillStyle = "#fff";

    ctx.fillRect(
      cx - 7,
      cy - 7,
      14,
      14
    );

    ctx.fillStyle = "#000";

    ctx.fillRect(
      cx - 3,
      cy - 3,
      6,
      6
    );
  }

  // ============================================================
  // GRAPH BRANCHES
  // ============================================================

  drawPlantConnections(snapshot) {
    const entries = snapshot.graphEntries;

    if (!entries) {
      return;
    }

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

        const powered =
          snapshot.connectedNodes.has(from) &&
          snapshot.connectedNodes.has(to);

        this.drawBranchSegment(
          fromPosition,
          toPosition,
          powered
        );
      }
    }
  }

  drawBranchSegment(from, to, powered) {
    const { ctx } = this;

    const x1 = from.x * TILE + TILE / 2;
    const y1 = from.y * TILE + TILE / 2;

    const x2 = to.x * TILE + TILE / 2;
    const y2 = to.y * TILE + TILE / 2;

    const color = powered
      ? "#fff"
      : "#555";

    ctx.strokeStyle = color;
    ctx.lineCap = "square";

    // Tronco principal
    ctx.lineWidth = powered ? 7 : 5;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Pequenos galhos decorativos
    // Não representam novas arestas do Graph.
    ctx.lineWidth = powered ? 2 : 2;

    const horizontal = y1 === y2;

    ctx.beginPath();

    if (horizontal) {
      const midX = Math.round((x1 + x2) / 2);

      ctx.moveTo(midX, y1);
      ctx.lineTo(
        midX + (x2 > x1 ? -5 : 5),
        y1 - 6
      );
    } else {
      const midY = Math.round((y1 + y2) / 2);

      ctx.moveTo(x1, midY);
      ctx.lineTo(
        x1 + (y2 > y1 ? 6 : -6),
        midY + (y2 > y1 ? -5 : 5)
      );
    }

    ctx.stroke();
  }

  // ============================================================
  // PLANT NODE
  // ============================================================

  drawPlantNode(x, y, powered) {
    const { ctx } = this;

    const cx = x * TILE + TILE / 2;
    const cy = y * TILE + TILE / 2;

    const color = powered
      ? "#fff"
      : "#666";

    // Pequenas folhas pixeladas
    ctx.fillStyle = color;

    ctx.fillRect(
      cx - 12,
      cy - 4,
      7,
      4
    );

    ctx.fillRect(
      cx + 5,
      cy,
      7,
      4
    );

    // Nó arredondado em pixel-art
    ctx.fillRect(
      cx - 5,
      cy - 7,
      10,
      14
    );

    ctx.fillRect(
      cx - 7,
      cy - 5,
      14,
      10
    );

    // Núcleo
    ctx.fillStyle = powered
      ? "#000"
      : "#222";

    ctx.fillRect(
      cx - 2,
      cy - 2,
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

    const cx =
      position.x * TILE + TILE / 2;

    const cy =
      position.y * TILE + TILE / 2;

    // Aura
    ctx.fillStyle = "#151515";

    ctx.fillRect(
      cx - 17,
      cy - 17,
      34,
      34
    );

    // Diamante
    ctx.fillStyle = "#fff";

    ctx.beginPath();

    ctx.moveTo(cx, cy - 15);
    ctx.lineTo(cx + 12, cy);
    ctx.lineTo(cx, cy + 15);
    ctx.lineTo(cx - 12, cy);

    ctx.closePath();
    ctx.fill();

    // Interior
    ctx.fillStyle = "#000";

    ctx.beginPath();

    ctx.moveTo(cx, cy - 8);
    ctx.lineTo(cx + 6, cy);
    ctx.lineTo(cx, cy + 8);
    ctx.lineTo(cx - 6, cy);

    ctx.closePath();
    ctx.fill();

    // Brilho
    ctx.fillStyle = "#fff";

    ctx.fillRect(
      cx - 3,
      cy - 10,
      4,
      4
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

    const cx =
      position.x * TILE + TILE / 2;

    const cy =
      position.y * TILE + TILE / 2;

    this.drawRobotFallback(cx, cy);

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

    // Personagem ocupa praticamente o tile,
    // sem distorcer a proporção.
    const maxWidth = TILE * 1.05;
    const maxHeight = TILE * 1.05;

    const scale = Math.min(
      maxWidth / imageWidth,
      maxHeight / imageHeight
    );

    const width = Math.max(
      1,
      Math.round(imageWidth * scale)
    );

    const height = Math.max(
      1,
      Math.round(imageHeight * scale)
    );

    const drawX = Math.round(
      cx - width / 2
    );

    const drawY = Math.round(
      cy - height / 2
    );

    ctx.imageSmoothingEnabled = false;

    ctx.drawImage(
      this.robotCanvas,
      drawX,
      drawY,
      width,
      height
    );
  }

  drawRobotFallback(cx, cy) {
    const { ctx } = this;

    ctx.fillStyle = "#fff";

    ctx.fillRect(
      Math.round(cx - 12),
      Math.round(cy - 13),
      24,
      26
    );

    ctx.fillStyle = "#000";

    ctx.fillRect(
      Math.round(cx - 7),
      Math.round(cy - 6),
      4,
      4
    );

    ctx.fillRect(
      Math.round(cx + 3),
      Math.round(cy - 6),
      4,
      4
    );

    ctx.fillRect(
      Math.round(cx - 6),
      Math.round(cy + 5),
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
