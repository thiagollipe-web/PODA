import {
  COLS,
  ROWS,
  TYPE,
  DIRECTIONS,
  MAX_PLANT_NODES,
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

    this.message = "CONECTE A PLANTA AO GEM";
    this.lastAction = null;

    this.player = {
      x: 1,
      y: 1,
    };

    this.root = {
      x: 6,
      y: 6,
    };

    this.gem = {
      x: 10,
      y: 1,
    };

    this.grid = this.createGrid();

    this.graph = new Graph();

    const rootKey = this.getRootKey();

    this.graph.addNode(rootKey);

    this.grid[this.root.y][this.root.x] = TYPE.ROOT;
    this.grid[this.gem.y][this.gem.x] = TYPE.GEM;

    this.connectedNodes = new Set([rootKey]);

    this.validateGraph();

    this.notify();
  }

  createGrid() {
    const grid = Array.from(
      { length: ROWS },
      () => Array(COLS).fill(TYPE.EMPTY)
    );

    // Bordas
    for (let x = 0; x < COLS; x++) {
      grid[0][x] = TYPE.WALL;
      grid[ROWS - 1][x] = TYPE.WALL;
    }

    for (let y = 0; y < ROWS; y++) {
      grid[y][0] = TYPE.WALL;
      grid[y][COLS - 1] = TYPE.WALL;
    }

    return grid;
  }

  key(x, y) {
    return `${x},${y}`;
  }

  fromKey(key) {
    const [x, y] = key.split(",").map(Number);

    return {
      x,
      y,
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
    const keys = [];

    for (const key of this.graph.nodes()) {
      if (key === this.getRootKey()) {
        continue;
      }

      const { x, y } = this.fromKey(key);

      if (!this.isInside(x, y)) {
        continue;
      }

      const type = this.grid[y][x];

      if (
        type === TYPE.PLANT ||
        type === TYPE.POWERED
      ) {
        keys.push(key);
      }
    }

    return keys;
  }

  countPlants() {
    return this.getPlantKeys().length;
  }

  isCellBlockedForGrowth(x, y) {
    if (!this.isInside(x, y)) {
      return true;
    }

    const type = this.grid[y][x];

    if (type === TYPE.WALL) {
      return true;
    }

    if (type === TYPE.GEM) {
      return true;
    }

    if (type === TYPE.ROOT) {
      return true;
    }

    if (
      type === TYPE.PLANT ||
      type === TYPE.POWERED
    ) {
      return true;
    }

    if (
      this.player.x === x &&
      this.player.y === y
    ) {
      return true;
    }

    return false;
  }

  addBranch(parentKey, x, y) {
    if (!this.isInside(x, y)) {
      return false;
    }

    if (!this.graph.hasNode(parentKey)) {
      return false;
    }

    if (this.countPlants() >= MAX_PLANT_NODES) {
      return false;
    }

    if (this.isCellBlockedForGrowth(x, y)) {
      return false;
    }

    const childKey = this.key(x, y);

    if (this.graph.hasNode(childKey)) {
      return false;
    }

    const parent = this.fromKey(parentKey);

    const distance =
      Math.abs(parent.x - x) +
      Math.abs(parent.y - y);

    if (distance !== 1) {
      return false;
    }

    this.graph.addNode(childKey);
    this.graph.addEdge(
      parentKey,
      childKey
    );

    this.grid[y][x] = TYPE.PLANT;

    return true;
  }

  removeNode(key) {
    if (key === this.getRootKey()) {
      return false;
    }

    if (!this.graph.hasNode(key)) {
      return false;
    }

    const position = this.fromKey(key);

    this.graph.removeNode(key);

    if (this.isInside(position.x, position.y)) {
      if (
        this.grid[position.y][position.x] === TYPE.PLANT ||
        this.grid[position.y][position.x] === TYPE.POWERED
      ) {
        this.grid[position.y][position.x] = TYPE.EMPTY;
      }
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
    const connected =
      this.connectedFromRoot();

    this.connectedNodes = connected;

    for (const key of this.graph.nodes()) {
      if (key === this.getRootKey()) {
        continue;
      }

      const position = this.fromKey(key);

      if (!this.isInside(position.x, position.y)) {
        continue;
      }

      if (connected.has(key)) {
        this.grid[position.y][position.x] =
          TYPE.POWERED;
      } else {
        this.grid[position.y][position.x] =
          TYPE.PLANT;
      }
    }

    return connected;
  }

  removeOrphans() {
    const connected =
      this.connectedFromRoot();

    const orphanKeys = [];

    for (const key of this.graph.nodes()) {
      if (key === this.getRootKey()) {
        continue;
      }

      if (!connected.has(key)) {
        orphanKeys.push(key);
      }
    }

    for (const key of orphanKeys) {
      this.removeNode(key);
    }

    this.connectedNodes =
      this.connectedFromRoot();

    return orphanKeys;
  }

  pruneAt(key) {
    if (this.gameOver) {
      return false;
    }

    if (!this.graph.hasNode(key)) {
      this.message = "NÃO HÁ PLANTA AQUI";
      return false;
    }

    if (key === this.getRootKey()) {
      this.message = "A RAIZ NÃO PODE SER PODADA";
      return false;
    }

    const removed =
      this.removeNode(key);

    if (!removed) {
      return false;
    }

    const orphanKeys =
      this.removeOrphans();

    const removedCount =
      1 + orphanKeys.length;

    this.score += removedCount;

    this.lastAction = {
      type: "prune",
      key,
      removedCount,
    };

    this.message =
      removedCount > 1
        ? `PODA: ${removedCount} NÓS REMOVIDOS`
        : "PODA REALIZADA";

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

    const candidates = [];

    for (const direction of DIRECTIONS) {
      const x =
        this.player.x + direction.x;

      const y =
        this.player.y + direction.y;

      if (!this.isInside(x, y)) {
        continue;
      }

      const type = this.grid[y][x];

      if (
        type === TYPE.PLANT ||
        type === TYPE.POWERED
      ) {
        candidates.push(
          this.key(x, y)
        );
      }
    }

    if (candidates.length === 0) {
      this.message =
        "NENHUM RAMO ADJACENTE PARA PODAR";

      this.lastAction = {
        type: "prune_failed",
      };

      this.notify();

      return false;
    }

    return this.pruneAt(
      candidates[0]
    );
  }

  shuffle(array) {
    const copy = [...array];

    for (
      let i = copy.length - 1;
      i > 0;
      i--
    ) {
      const j =
        Math.floor(
          Math.random() * (i + 1)
        );

      [
        copy[i],
        copy[j],
      ] = [
        copy[j],
        copy[i],
      ];
    }

    return copy;
  }

  grow() {
    if (this.gameOver) {
      return false;
    }

    if (
      this.countPlants() >=
      MAX_PLANT_NODES
    ) {
      this.message =
        "CRESCIMENTO MÁXIMO ATINGIDO";

      return false;
    }

    const sources =
      this.shuffle(
        this.graph.nodes()
      );

    const directions =
      this.shuffle(
        DIRECTIONS
      );

    for (const sourceKey of sources) {
      const source =
        this.fromKey(sourceKey);

      const shuffledDirections =
        this.shuffle(directions);

      for (
        const direction of shuffledDirections
      ) {
        const x =
          source.x + direction.x;

        const y =
          source.y + direction.y;

        if (
          this.addBranch(
            sourceKey,
            x,
            y
          )
        ) {
          this.lastAction = {
            type: "grow",
            from: sourceKey,
            to: this.key(x, y),
          };

          this.message =
            "A PLANTA CRESCEU";

          return true;
        }
      }
    }

    this.message =
      "A PLANTA NÃO PODE CRESCER";

    return false;
  }

  isAdjacentToGem(key) {
    const position =
      this.fromKey(key);

    return (
      Math.abs(
        position.x - this.gem.x
      ) +
      Math.abs(
        position.y - this.gem.y
      ) === 1
    );
  }

  updateVictory() {
    const connected =
      this.connectedFromRoot();

    this.connectedNodes =
      connected;

    for (const key of connected) {
      if (key === this.getRootKey()) {
        continue;
      }

      if (this.isAdjacentToGem(key)) {
        this.victory = true;
        this.gameOver = true;
        this.message =
          "VITÓRIA — A PLANTA ALCANÇOU O GEM";

        return true;
      }
    }

    this.victory = false;

    return false;
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
      this.message =
        "MOVIMENTO BLOQUEADO";

      return false;
    }

    const type =
      this.grid[nextY][nextX];

    if (type === TYPE.WALL) {
      this.message =
        "PAREDE";

      return false;
    }

    if (
      type === TYPE.PLANT ||
      type === TYPE.POWERED
    ) {
      this.message =
        "RAMO BLOQUEANDO O CAMINHO";

      return false;
    }

    if (type === TYPE.ROOT) {
      this.message =
        "RAIZ BLOQUEANDO O CAMINHO";

      return false;
    }

    if (type === TYPE.GEM) {
      this.message =
        "O GEM PRECISA SER ALCANÇADO PELA PLANTA";

      return false;
    }

    this.player = {
      x: nextX,
      y: nextY,
    };

    this.lastAction = {
      type: "move",
      player: {
        ...this.player,
      },
    };

    this.message = "MOVIMENTO";

    this.grow();
    this.updateConnectivity();
    this.updateVictory();
    this.validateGraph();
    this.notify();

    return true;
  }

  updateAfterAction() {
    this.updateConnectivity();
    this.updateVictory();
    this.validateGraph();
    this.notify();
  }

  validateGraph() {
    const errors = [];

    const rootKey =
      this.getRootKey();

    if (!this.graph.hasNode(rootKey)) {
      errors.push(
        "ROOT não existe no Graph"
      );
    }

    for (const key of this.graph.nodes()) {
      const position =
        this.fromKey(key);

      if (
        !this.isInside(
          position.x,
          position.y
        )
      ) {
        errors.push(
          `Nó fora do mapa: ${key}`
        );

        continue;
      }

      if (key !== rootKey) {
        const type =
          this.grid[position.y][position.x];

        if (
          type !== TYPE.PLANT &&
          type !== TYPE.POWERED
        ) {
          errors.push(
            `Nó do Graph sem planta no Grid: ${key}`
          );
        }
      }

      for (
        const neighbor
        of this.graph.getNeighbors(key)
      ) {
        if (
          !this.graph.hasNode(neighbor)
        ) {
          errors.push(
            `Referência inválida: ${key} -> ${neighbor}`
          );

          continue;
        }

        const neighborPosition =
          this.fromKey(neighbor);

        const distance =
          Math.abs(
            position.x -
              neighborPosition.x
          ) +
          Math.abs(
            position.y -
              neighborPosition.y
          );

        if (distance !== 1) {
          errors.push(
            `Aresta não ortogonal: ${key} -> ${neighbor}`
          );
        }
      }
    }

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const type =
          this.grid[y][x];

        const key =
          this.key(x, y);

        if (
          type === TYPE.PLANT ||
          type === TYPE.POWERED
        ) {
          if (!this.graph.hasNode(key)) {
            errors.push(
              `Planta no Grid sem nó no Graph: ${key}`
            );
          }
        }

        if (
          type === TYPE.ROOT &&
          key !== rootKey
        ) {
          errors.push(
            `ROOT inesperado no Grid: ${key}`
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  getSnapshot() {
    return {
      gameOver: this.gameOver,
      victory: this.victory,
      score: this.score,

      player: {
        ...this.player,
      },

      root: {
        ...this.root,
      },

      gem: {
        ...this.gem,
      },

      grid: this.grid.map(
        (row) => [...row]
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

      // Disponibiliza as arestas do Graph
      // para o renderer sem permitir que
      // a apresentação altere o Graph.
      graphEntries:
        this.graph.entries(),

      graphValidation:
        this.validateGraph(),
    };
  }
}
