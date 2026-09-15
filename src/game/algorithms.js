export function bfs(graph, start) {
  const visited = new Set();

  if (!graph.hasNode(start)) {
    return visited;
  }

  const queue = [start];
  let index = 0;

  visited.add(start);

  while (index < queue.length) {
    const current = queue[index++];

    for (const neighbor of graph.getNeighbors(current)) {
      if (visited.has(neighbor)) {
        continue;
      }

      visited.add(neighbor);
      queue.push(neighbor);
    }
  }

  return visited;
}