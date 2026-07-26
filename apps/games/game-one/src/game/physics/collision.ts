export type Point = {
  x: number;
  y: number;
};

export type Rectangle = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CollisionMap = {
  columns: number;
  rows: number;
  tileSize: number;
  collision: readonly Rectangle[];
  getNearbyCollision?: (point: Point, radius: number) => readonly Rectangle[];
  isWalkablePoint?: (point: Point) => boolean;
};

export function clampPointToWorld(point: Point, radius: number, map: CollisionMap): Point {
  const maxX = map.columns * map.tileSize - radius;
  const maxY = map.rows * map.tileSize - radius;

  return {
    x: clamp(point.x, radius, maxX),
    y: clamp(point.y, radius, maxY)
  };
}

export function collidesWithObstacle(point: Point, radius: number, obstacles: readonly Rectangle[]) {
  const playerBox = {
    x: point.x - radius,
    y: point.y - radius,
    width: radius * 2,
    height: radius * 2
  };

  return obstacles.some((obstacle) => rectanglesOverlap(playerBox, obstacle));
}

export function canOccupy(point: Point, radius: number, map: CollisionMap) {
  const clamped = clampPointToWorld(point, radius, map);
  if (clamped.x !== point.x || clamped.y !== point.y) {
    return false;
  }

  if (map.isWalkablePoint && !isFootprintWalkable(point, radius, map.isWalkablePoint)) {
    return false;
  }

  return !collidesWithObstacle(point, radius, map.getNearbyCollision?.(point, radius) ?? map.collision);
}

export function createCollisionLookup(obstacles: readonly Rectangle[], cellSize = 64) {
  const cells = new Map<string, Rectangle[]>();
  for (const obstacle of obstacles) {
    const left = Math.floor(obstacle.x / cellSize);
    const right = Math.floor((obstacle.x + obstacle.width) / cellSize);
    const top = Math.floor(obstacle.y / cellSize);
    const bottom = Math.floor((obstacle.y + obstacle.height) / cellSize);
    for (let cellY = top; cellY <= bottom; cellY += 1) {
      for (let cellX = left; cellX <= right; cellX += 1) {
        const key = `${cellX}:${cellY}`;
        const bucket = cells.get(key) ?? [];
        bucket.push(obstacle);
        cells.set(key, bucket);
      }
    }
  }

  return (point: Point, radius: number) => {
    const found = new Set<Rectangle>();
    const left = Math.floor((point.x - radius) / cellSize);
    const right = Math.floor((point.x + radius) / cellSize);
    const top = Math.floor((point.y - radius) / cellSize);
    const bottom = Math.floor((point.y + radius) / cellSize);
    for (let cellY = top; cellY <= bottom; cellY += 1) {
      for (let cellX = left; cellX <= right; cellX += 1) {
        for (const obstacle of cells.get(`${cellX}:${cellY}`) ?? []) found.add(obstacle);
      }
    }
    return [...found];
  };
}

function isFootprintWalkable(point: Point, radius: number, isWalkablePoint: (point: Point) => boolean) {
  const inset = Math.max(radius - 2, 0);
  return [
    point,
    { x: point.x - inset, y: point.y - inset },
    { x: point.x + inset, y: point.y - inset },
    { x: point.x - inset, y: point.y + inset },
    { x: point.x + inset, y: point.y + inset }
  ].every(isWalkablePoint);
}

function rectanglesOverlap(a: Omit<Rectangle, "id">, b: Rectangle) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function clamp(value: number, min: number, max: number) {
  if (max < min) {
    return (min + max) / 2;
  }

  return Math.min(Math.max(value, min), max);
}
