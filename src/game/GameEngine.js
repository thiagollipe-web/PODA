import {
  COLS,
  ROWS,
  DIRECTIONS,
  MAX_PLANT_NODES,
  TYPE
} from "./constants.js";

import { Graph } from "./Graph.js";
import { bfs } from "./algorithms.js";

export class GameEngine {
  constructor() {
    this.listeners = new Set();

    this.reset();
  }

  subscribe(listener) {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  notify() {
    const snapshot = this.getSnapshot();

    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  reset() {
    this.gameOver = false;
    this.victory = false;

    this.score = 0;

    this.message =
      "Use as setas para mover o robô e ESPAÇO para podar.";

    this.player = {
      x: 1,
      y: 1
    };

    this.root = {
      x: 6,
      y: 6
    };

    this.gem = {
      x: 10,
      y: 1
    };

    this.grid = this.createGrid();

    this.graph = new Graph();

    const rootKey = this.key(
      this.root.x,
      this.root.y
    );

    this.graph.addNode(rootKey);

    this.grid[
      this.root.y
    ][this.root.x] = TYPE.ROOT;

    this.grid[
      this.gem.y
    ][this.gem.x] = TYPE.GEM;

    this.connectedNodes = new Set([
      rootKey
    ]);

    this.lastAction = null;

    this.validateGraph();

    this.notify();
  }

  createGrid() {
    const grid = Array.from(
      { length: ROWS },
      () => Array(COLS).fill(TYPE.EMPTY)
    );

    /*
     * Borda externa do mapa.
     */
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (
          x === 0 ||
          x === COLS - 1 ||
          y === 0 ||
          y === ROWS - 1
        ) {
          grid[y][x] = TYPE.WALL;
        }
      }
    }

    return grid;
  }

  key(x, y) {
    return `${x},${y}`;
  }

  fromKey(key) {
    const [x, y] = key
      .split(",")
      .map(Number);

    return {
      x,
      y
    };
  }

  isInside(x, y) {
    return (
      x >= 0 &&
      x < COLS &&
      y >= 0 &&
      y < ROWS
    );
  }

  getRootKey() {
    return this.key(
      this.root.x,
      this.root.y
    );
  }

  getGemKey() {
    return this.key(
      this.gem.x,
      this.gem.y
    );
  }

  getPlantKeys() {
    const rootKey =
      this.getRootKey();

    return this.graph
      .nodes()
      .filter(
        nodeKey =>
          nodeKey !== rootKey
      );
  }

  countPlants() {
    return this.getPlantKeys().length;
  }

  isCellBlockedForGrowth(x, y) {
    if (!this.isInside(x, y)) {
      return true;
    }

    if (
      this.grid[y][x] === TYPE.WALL
    ) {
      return true;
    }

    if (
      x === this.player.x &&
      y === this.player.y
    ) {
      return true;
    }

    if (
      x === this.gem.x &&
      y === this.gem.y
    ) {
      return true;
    }

    if (
      x === this.root.x &&
      y === this.root.y
    ) {
      return true;
    }

    if (
      this.grid[y][x] === TYPE.PLANT ||
      this.grid[y][x] === TYPE.POWERED
    ) {
      return true;
    }

    return false;
  }

  addBranch(
    fromKey,
    x,
    y
  ) {
    if (!this.isInside(x, y)) {
      return false;
    }

    if (
      !this.graph.hasNode(fromKey)
    ) {
      return false;
    }

    if (
      this.countPlants() >=
      MAX_PLANT_NODES
    ) {
      return false;
    }

    if (
      this.isCellBlockedForGrowth(
        x,
        y
      )
    ) {
      return false;
    }

    const targetKey =
      this.key(x, y);

    if (
      this.graph.hasNode(targetKey)
    ) {
      return false;
    }

    const parent =
      this.fromKey(fromKey);

    /*
     * Planta somente cresce
     * ortogonalmente.
     */
    const distance =
      Math.abs(parent.x - x) +
      Math.abs(parent.y - y);

    if (distance !== 1) {
      return false;
    }

    this.graph.addNode(
      targetKey
    );

    this.graph.addEdge(
      fromKey,
      targetKey
    );

    this.grid[y][x] =
      TYPE.PLANT;

    return true;
  }

  removeNode(nodeKey) {
    /*
     * ROOT nunca pode ser removido.
     */
    if (
      nodeKey === this.getRootKey()
    ) {
      return false;
    }

    if (
      !this.graph.hasNode(nodeKey)
    ) {
      return false;
    }

    const {
      x,
      y
    } = this.fromKey(nodeKey);

    this.graph.removeNode(
      nodeKey
    );

    if (
      this.isInside(x, y) &&
      this.grid[y][x] !== TYPE.WALL
    ) {
      this.grid[y][x] =
        TYPE.EMPTY;
    }

    return true;
  }

  connectedFromRoot() {
    return bfs(
      this.graph,
      this.getRootKey()
    );
  }

  updateConnectivity() {
    this.connectedNodes =
      this.connectedFromRoot();

    const rootKey =
      this.getRootKey();

    for (
      const nodeKey
      of this.graph.nodes()
    ) {
      if (
        nodeKey === rootKey
      ) {
        continue;
      }

      const {
        x,
        y
      } = this.fromKey(nodeKey);

      if (
        !this.isInside(x, y)
      ) {
        continue;
      }

      this.grid[y][x] =
        this.connectedNodes.has(
          nodeKey
        )
          ? TYPE.POWERED
          : TYPE.PLANT;
    }
  }

  removeOrphans() {
    const connected =
      this.connectedFromRoot();

    const allNodes =
      this.graph.nodes();

    let removed = 0;

    for (
      const nodeKey
      of allNodes
    ) {
      if (
        nodeKey ===
        this.getRootKey()
      ) {
        continue;
      }

      if (
        !connected.has(nodeKey)
      ) {
        if (
          this.removeNode(
            nodeKey
          )
        ) {
          removed++;
        }
      }
    }

    this.updateConnectivity();

    return removed;
  }

  pruneAt(x, y) {
    if (this.gameOver) {
      return false;
    }

    if (
      !this.isInside(x, y)
    ) {
      return false;
    }

    const targetKey =
      this.key(x, y);

    if (
      !this.graph.hasNode(
        targetKey
      )
    ) {
      return false;
    }

    if (
      targetKey ===
      this.getRootKey()
    ) {
      return false;
    }

    const removed =
      this.removeNode(
        targetKey
      );

    if (!removed) {
      return false;
    }

    const orphanCount =
      this.removeOrphans();

    this.score +=
      1 + orphanCount;

    this.lastAction = "prune";

    if (orphanCount > 0) {
      this.message =
        `Poda realizada. ${orphanCount} galho(s) órfão(s) removido(s).`;
    } else {
      this.message =
        "Poda realizada.";
    }

    this.updateConnectivity();

    this.updateVictory();

    this.validateGraph();

    this.notify();

    return true;
  }

  pruneAdjacent() {
    if (this.gameOver) {
      return false;
    }

    for (
      const direction
      of DIRECTIONS
    ) {
      const x =
        this.player.x +
        direction.x;

      const y =
        this.player.y +
        direction.y;

      if (
        !this.isInside(x, y)
      ) {
        continue;
      }

      const cell =
        this.grid[y][x];

      if (
        cell === TYPE.PLANT ||
        cell === TYPE.POWERED
      ) {
        return this.pruneAt(
          x,
          y
        );
      }
    }

    this.message =
      "Nenhum galho ao alcance para podar.";

    this.lastAction =
      "prune-fail";

    this.notify();

    return false;
  }

  grow() {
    if (this.gameOver) {
      return false;
    }

    if (
      this.countPlants() >=
      MAX_PLANT_NODES
    ) {
      return false;
    }

    const sources =
      this.graph.nodes();

    const shuffledSources =
      [...sources].sort(
        () =>
          Math.random() -
          0.5
      );

    for (
      const sourceKey
      of shuffledSources
    ) {
      const source =
        this.fromKey(
          sourceKey
        );

      const directions =
        [...DIRECTIONS].sort(
          () =>
            Math.random() -
            0.5
        );

      for (
        const direction
        of directions
      ) {
        const x =
          source.x +
          direction.x;

        const y =
          source.y +
          direction.y;

        if (
          this.addBranch(
            sourceKey,
            x,
            y
          )
        ) {
          this.lastAction =
            "grow";

          this.message =
            "A planta encontrou um novo caminho.";

          this.updateConnectivity();

          this.updateVictory();

          this.validateGraph();

          this.notify();

          return true;
        }
      }
    }

    return false;
  }

  updateVictory() {
    if (this.gameOver) {
      return;
    }

    const gemX =
      this.gem.x;

    const gemY =
      this.gem.y;

    /*
     * Vitória acontece quando um nó
     * conectado à ROOT fica
     * ortogonalmente adjacente à GEM.
     */
    const connectedToGem =
      [...this.connectedNodes].some(
        nodeKey => {
          if (
            nodeKey ===
            this.getRootKey()
          ) {
            return false;
          }

          const {
            x,
            y
          } = this.fromKey(
            nodeKey
          );

          return (
            Math.abs(x - gemX) +
              Math.abs(y - gemY) ===
            1
          );
        }
      );

    if (connectedToGem) {
      this.victory = true;
      this.gameOver = true;

      this.message =
        "A planta conectou a raiz à gema.";

      this.lastAction =
        "victory";
    }
  }

  move(dx, dy) {
    if (this.gameOver) {
      return false;
    }

    const nextX =
      this.player.x + dx;

    const nextY =
      this.player.y + dy;

    if (
      !this.isInside(
        nextX,
        nextY
      )
    ) {
      return false;
    }

    const cell =
      this.grid[nextY][nextX];

    if (cell === TYPE.WALL) {
      this.message =
        "Parede bloqueando o caminho.";

      this.lastAction =
        "blocked";

      this.notify();

      return false;
    }

    /*
     * O robô não atravessa
     * ROOT nem planta.
     */
    if (
      cell === TYPE.PLANT ||
      cell === TYPE.POWERED ||
      cell === TYPE.ROOT
    ) {
      this.message =
        "O robô não pode atravessar a planta.";

      this.lastAction =
        "blocked";

      this.notify();

      return false;
    }

    this.player.x =
      nextX;

    this.player.y =
      nextY;

    this.lastAction =
      "move";

    this.message =
      "Movimento realizado.";

    /*
     * Cada movimento válido
     * permite uma tentativa de crescimento.
     */
    this.grow();

    this.updateConnectivity();

    this.updateVictory();

    this.validateGraph();

    this.notify();

    return true;
  }

  validateGraph() {
    const errors = [];

    const rootKey =
      this.getRootKey();

    /*
     * ROOT precisa existir no Graph.
     */
    if (
      !this.graph.hasNode(
        rootKey
      )
    ) {
      errors.push(
        "ROOT ausente do Graph."
      );
    }

    /*
     * Validação Graph -> Grid.
     */
    for (
      const [
        nodeKey,
        neighbors
      ] of this.graph.entries()
    ) {
      const {
        x,
        y
      } = this.fromKey(
        nodeKey
      );

      if (
        !this.isInside(x, y)
      ) {
        errors.push(
          `Nó fora do mapa: ${nodeKey}`
        );
      }

      if (
        nodeKey !== rootKey &&
        this.grid[y]?.[x] !==
          TYPE.PLANT &&
        this.grid[y]?.[x] !==
          TYPE.POWERED
      ) {
        errors.push(
          `Graph/Grid inconsistente: ${nodeKey}`
        );
      }

      /*
       * Toda referência deve
       * apontar para um nó existente.
       */
      for (
        const neighborKey
        of neighbors
      ) {
        if (
          !this.graph.hasNode(
            neighborKey
          )
        ) {
          errors.push(
            `Referência inválida: ${nodeKey} -> ${neighborKey}`
          );

          continue;
        }

        const neighbor =
          this.fromKey(
            neighborKey
          );

        /*
         * Arestas precisam ser
         * ortogonais.
         */
        const distance =
          Math.abs(
            x - neighbor.x
          ) +
          Math.abs(
            y - neighbor.y
          );

        if (
          distance !== 1
        ) {
          errors.push(
            `Aresta não ortogonal: ${nodeKey} -> ${neighborKey}`
          );
        }
      }
    }

    /*
     * Validação Grid -> Graph.
     */
    for (
      let y = 0;
      y < ROWS;
      y++
    ) {
      for (
        let x = 0;
        x < COLS;
        x++
      ) {
        const cell =
          this.grid[y][x];

        if (
          cell !== TYPE.PLANT &&
          cell !== TYPE.POWERED
        ) {
          continue;
        }

        const nodeKey =
          this.key(x, y);

        if (
          !this.graph.hasNode(
            nodeKey
          )
        ) {
          errors.push(
            `Planta sem nó no Graph: ${nodeKey}`
          );
        }
      }
    }

    return {
      valid:
        errors.length === 0,

      errors
    };
  }

  getSnapshot() {
    return {
      gameOver:
        this.gameOver,

      victory:
        this.victory,

      score:
        this.score,

      player: {
        ...this.player
      },

      root: {
        ...this.root
      },

      gem: {
        ...this.gem
      },

      grid:
        this.grid.map(
          row => [...row]
        ),

      connectedNodes:
        new Set(
          this.connectedNodes
        ),

      plantCount:
        this.countPlants(),

      message:
        this.message,

      lastAction:
        this.lastAction,

      graphValidation:
        this.validateGraph()
    };
  }
}