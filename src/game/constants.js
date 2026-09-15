export const COLS = 12;
export const ROWS = 8;

export const TILE = 40;

export const CANVAS_WIDTH = COLS * TILE;
export const CANVAS_HEIGHT = ROWS * TILE;

export const MAX_PLANT_NODES = 28;

export const TYPE = Object.freeze({
  EMPTY: 0,
  ROOT: 1,
  PLANT: 2,
  GEM: 3,
  POWERED: 4,
  WALL: 5
});

export const DIRECTIONS = Object.freeze([
  { x: 0, y: -1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
  { x: 0, y: 1 }
]);

export const ROBOT_ASSET = "/assets/robot.png";