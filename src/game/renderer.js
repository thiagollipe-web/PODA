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

      // Quando o PNG terminar de carregar,
      // redesenha o Canvas.
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

    // Limpa o Canvas inteiro.
    ctx.clearRect(
      0,
      0,
      COLS * TILE,
      ROWS * TILE
    );

    // Ordem de desenho.
    this.drawBackground();
    this.drawGrid(snapshot);
    this.drawGem(snapshot.gem);
    this.drawRobot(snapshot.player);
  }

  drawBackground() {
    const { ctx } = this;

    ctx.fillStyle = "#000";

    ctx.fillRect(
      0,
      0,
      COLS * TILE,
      ROWS * TILE
    );
  }

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
            this.drawPlant(x, y, false);
            break;

          case TYPE.POWERED:
            this.drawPlant(x, y, true);
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

    ctx.strokeStyle = "#111";
    ctx.lineWidth = 1;

    // Linhas verticais.
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath();

      ctx.moveTo(
        x * TILE + 0.5,
        0
      );

      ctx.lineTo(
        x * TILE + 0.5,
        ROWS * TILE
      );

      ctx.stroke();
    }

    // Linhas horizontais.
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath();

      ctx.moveTo(
        0,
        y * TILE + 0.5
      );

      ctx.lineTo(
        COLS * TILE,
        y * TILE + 0.5
      );

      ctx.stroke();
    }
  }

  drawWall(x, y) {
    const { ctx } = this;

    const px = x * TILE;
    const py = y * TILE;

    // Corpo da parede.
    ctx.fillStyle = "#1c1c1c";

    ctx.fillRect(
      px,
      py,
      TILE,
      TILE
    );

    // Borda.
    ctx.strokeStyle = "#444";
    ctx.lineWidth = 2;

    ctx.strokeRect(
      px + 1,
      py + 1,
      TILE - 2,
      TILE - 2
    );
  }

  drawRoot(x, y) {
    const { ctx } = this;

    const centerX =
      x * TILE + TILE / 2;

    const centerY =
      y * TILE + TILE / 2;

    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 5;

    ctx.beginPath();

    // Horizontal.
    ctx.moveTo(
      centerX - 10,
      centerY
    );

    ctx.lineTo(
      centerX + 10,
      centerY
    );

    // Vertical.
    ctx.moveTo(
      centerX,
      centerY - 10
    );

    ctx.lineTo(
      centerX,
      centerY + 10
    );

    ctx.stroke();

    ctx.fillStyle = "#fff";

    ctx.fillRect(
      centerX - 4,
      centerY - 4,
      8,
      8
    );
  }

  drawPlant(x, y, powered) {
    const { ctx } = this;

    const centerX =
      x * TILE + TILE / 2;

    const centerY =
      y * TILE + TILE / 2;

    // Planta conectada ao ROOT fica mais forte/branca.
    ctx.strokeStyle = powered
      ? "#fff"
      : "#777";

    ctx.lineWidth = powered ? 5 : 3;

    ctx.beginPath();

    // Horizontal.
    ctx.moveTo(
      centerX - 12,
      centerY
    );

    ctx.lineTo(
      centerX + 12,
      centerY
    );

    // Vertical.
    ctx.moveTo(
      centerX,
      centerY - 12
    );

    ctx.lineTo(
      centerX,
      centerY + 12
    );

    ctx.stroke();

    ctx.fillStyle = powered
      ? "#fff"
      : "#888";

    ctx.fillRect(
      centerX - 3,
      centerY - 3,
      6,
      6
    );
  }

  drawGem(position) {
    if (!position) {
      return;
    }

    const { ctx } = this;

    const centerX =
      position.x * TILE + TILE / 2;

    const centerY =
      position.y * TILE + TILE / 2;

    // Diamante externo.
    ctx.fillStyle = "#fff";

    ctx.beginPath();

    ctx.moveTo(
      centerX,
      centerY - 12
    );

    ctx.lineTo(
      centerX + 10,
      centerY
    );

    ctx.lineTo(
      centerX,
      centerY + 12
    );

    ctx.lineTo(
      centerX - 10,
      centerY
    );

    ctx.closePath();

    ctx.fill();

    // Centro preto.
    ctx.fillStyle = "#000";

    ctx.beginPath();

    ctx.moveTo(
      centerX,
      centerY - 6
    );

    ctx.lineTo(
      centerX + 5,
      centerY
    );

    ctx.lineTo(
      centerX,
      centerY + 6
    );

    ctx.lineTo(
      centerX - 5,
      centerY
    );

    ctx.closePath();

    ctx.fill();
  }

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
      position.x * TILE + TILE / 2;

    const centerY =
      position.y * TILE + TILE / 2;

    /*
     * IMPORTANTE:
     *
     * Primeiro desenhamos um robô fallback.
     * Assim, mesmo que o PNG ainda esteja carregando,
     * o personagem continua visível.
     */
    this.drawRobotFallback(
      centerX,
      centerY
    );

    /*
     * Depois tentamos desenhar o asset definitivo.
     */
    if (
      this.robotLoaded &&
      this.robotImage.complete &&
      this.robotImage.naturalWidth > 0 &&
      this.robotImage.naturalHeight > 0
    ) {
      const maxSize = TILE * 0.78;

      const imageWidth =
        this.robotImage.naturalWidth;

      const imageHeight =
        this.robotImage.naturalHeight;

      const scale = Math.min(
        maxSize / imageWidth,
        maxSize / imageHeight
      );

      const width = Math.max(
        1,
        Math.round(
          imageWidth * scale
        )
      );

      const height = Math.max(
        1,
        Math.round(
          imageHeight * scale
        )
      );

      const drawX = Math.round(
        centerX - width / 2
      );

      const drawY = Math.round(
        centerY - height / 2
      );

      ctx.imageSmoothingEnabled = false;

      ctx.drawImage(
        this.robotImage,
        drawX,
        drawY,
        width,
        height
      );
    }
  }

  drawRobotFallback(centerX, centerY) {
    const { ctx } = this;

    const width = 24;
    const height = 26;

    /*
     * Corpo.
     */
    ctx.fillStyle = "#fff";

    ctx.fillRect(
      Math.round(centerX - width / 2),
      Math.round(centerY - height / 2),
      width,
      height
    );

    /*
     * Olho esquerdo.
     */
    ctx.fillStyle = "#000";

    ctx.fillRect(
      Math.round(centerX - 7),
      Math.round(centerY - 6),
      4,
      4
    );

    /*
     * Olho direito.
     */
    ctx.fillRect(
      Math.round(centerX + 3),
      Math.round(centerY - 6),
      4,
      4
    );

    /*
     * Boca.
     */
    ctx.fillRect(
      Math.round(centerX - 6),
      Math.round(centerY + 5),
      12,
      2
    );
  }
}