export class Graph {
  constructor() {
    this.adjacency = new Map();
  }

  addNode(node) {
    if (!this.adjacency.has(node)) {
      this.adjacency.set(node, new Set());
    }

    return true;
  }

  hasNode(node) {
    return this.adjacency.has(node);
  }

  addEdge(from, to) {
    this.addNode(from);
    this.addNode(to);

    this.adjacency.get(from).add(to);

    return true;
  }

  removeEdge(from, to) {
    const neighbors = this.adjacency.get(from);

    if (!neighbors) {
      return false;
    }

    return neighbors.delete(to);
  }

  removeNode(node) {
    if (!this.adjacency.has(node)) {
      return false;
    }

    this.adjacency.delete(node);

    for (const neighbors of this.adjacency.values()) {
      neighbors.delete(node);
    }

    return true;
  }

  getNeighbors(node) {
    const neighbors = this.adjacency.get(node);

    if (!neighbors) {
      return [];
    }

    return [...neighbors];
  }

  nodes() {
    return [...this.adjacency.keys()];
  }

  entries() {
    return [...this.adjacency.entries()];
  }

  clear() {
    this.adjacency.clear();
  }

  size() {
    return this.adjacency.size;
  }
}