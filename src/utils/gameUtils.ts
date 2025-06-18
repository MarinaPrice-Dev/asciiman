import type { Position, Direction, Ghost } from '../types/game';
import { GAME_WIDTH, GAME_HEIGHT } from '../types/game';
import { MAZE_LAYOUT } from '../constants/maze';

export const isValidPosition = (position: Position): boolean => {
  return (
    position.x >= 0 &&
    position.x < GAME_WIDTH &&
    position.y >= 0 &&
    position.y < GAME_HEIGHT &&
    MAZE_LAYOUT[position.y][position.x] !== '#'
  );
};

export const movePosition = (position: Position, direction: Direction): Position => {
  const newPosition = { ...position };
  // Tunnel row is y=14 (indexing from 0)
  const tunnelRow = 14;
  switch (direction) {
    case 'up':
      newPosition.y -= 1;
      break;
    case 'down':
      newPosition.y += 1;
      break;
    case 'left':
      if (newPosition.y === tunnelRow && newPosition.x === 0) {
        newPosition.x = GAME_WIDTH - 1;
      } else {
        newPosition.x -= 1;
      }
      break;
    case 'right':
      if (newPosition.y === tunnelRow && newPosition.x === GAME_WIDTH - 1) {
        newPosition.x = 0;
      } else {
        newPosition.x += 1;
      }
      break;
  }
  return newPosition;
};

export const getInitialFood = (): Position[] => {
  const food: Position[] = [];
  for (let y = 0; y < GAME_HEIGHT; y++) {
    for (let x = 0; x < GAME_WIDTH; x++) {
      if (MAZE_LAYOUT[y][x] === '.') {
        food.push({ x, y });
      }
    }
  }
  return food;
};

export const getInitialGhostPositions = (): Ghost[] => {
  return [
    { position: { x: 13, y: 13 }, color: '#ff0000', name: 'Blinky', lockOnDuration: 15, lockOnTimer: 0, speed: 300, lastMoved: 0 },
    { position: { x: 14, y: 13 }, color: '#ffb8ff', name: 'Pinky', lockOnDuration: 12, lockOnTimer: 0, speed: 300, lastMoved: 0 },
    { position: { x: 13, y: 14 }, color: '#00ffff', name: 'Inky', lockOnDuration: 10, lockOnTimer: 0, speed: 400, lastMoved: 0 },
    { position: { x: 14, y: 14 }, color: '#ffb852', name: 'Clyde', lockOnDuration: 6, lockOnTimer: 0, speed: 400, lastMoved: 0 },
  ];
};

const directions: Direction[] = ['up', 'down', 'left', 'right'];

function getOppositeDirection(dir: Direction): Direction {
  switch (dir) {
    case 'up': return 'down';
    case 'down': return 'up';
    case 'left': return 'right';
    case 'right': return 'left';
  }
}

function getAvailableDirections(pos: Position, excludeDir?: Direction): Direction[] {
  return directions.filter(dir => {
    if (excludeDir && dir === getOppositeDirection(excludeDir)) return false;
    const next = movePosition(pos, dir);
    return isValidPosition(next);
  });
}

function isPacmanVisible(ghost: Ghost, pacman: Position): Direction | null {
  // Check if Pacman is visible in a straight line (no walls) from ghost
  for (const dir of directions) {
    let pos = { ...ghost.position };
    while (true) {
      pos = movePosition(pos, dir);
      if (!isValidPosition(pos)) break;
      if (pos.x === pacman.x && pos.y === pacman.y) return dir;
    }
  }
  return null;
}

function getAngle(from: Position, to: Position): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

function directionToAngle(dir: Direction): number {
  switch (dir) {
    case 'right': return 0;
    case 'down': return Math.PI / 2;
    case 'left': return Math.PI;
    case 'up': return -Math.PI / 2;
  }
}

export const moveGhost = (ghost: Ghost, pacmanPos: Position): Ghost => {
  const { direction, lockOn, lockOnTimer, lockOnDuration } = ghost;
  let newDirection = direction;
  let newLockOn = lockOn;
  let newLockOnTimer = lockOnTimer ?? 0;

  // Check if Pacman is visible
  const visibleDir = isPacmanVisible(ghost, pacmanPos);
  if (visibleDir) {
    newDirection = visibleDir;
    newLockOn = true;
    newLockOnTimer = lockOnDuration ?? 10; // fallback to 10s if not set
  } else if (lockOn && newLockOnTimer > 0) {
    // Still locked on, keep following
    newLockOn = true;
  } else {
    newLockOn = false;
    newLockOnTimer = 0;
  }

  // If no direction, pick a random valid one
  if (!newDirection) {
    const dirs = getAvailableDirections(ghost.position);
    newDirection = dirs[Math.floor(Math.random() * dirs.length)];
  }

  // Try to move in the current direction
  let nextPos = movePosition(ghost.position, newDirection);
  if (!isValidPosition(nextPos)) {
    // Hit a wall, pick a new direction (not opposite)
    const dirs = getAvailableDirections(ghost.position, newDirection);
    if (dirs.length > 0) {
      if (newLockOn) {
        // Pick direction closest to Pacman
        const angleToPacman = getAngle(ghost.position, pacmanPos);
        newDirection = dirs.reduce((bestDir, dir) => {
          const diff = Math.abs(
            Math.atan2(
              Math.sin(angleToPacman - directionToAngle(dir)),
              Math.cos(angleToPacman - directionToAngle(dir))
            )
          );
          const bestDiff = Math.abs(
            Math.atan2(
              Math.sin(angleToPacman - directionToAngle(bestDir)),
              Math.cos(angleToPacman - directionToAngle(bestDir))
            )
          );
          return diff < bestDiff ? dir : bestDir;
        }, dirs[0]);
      } else {
        newDirection = dirs[Math.floor(Math.random() * dirs.length)];
      }
      nextPos = movePosition(ghost.position, newDirection);
    } else {
      // Stuck, stay in place
      nextPos = ghost.position;
    }
  } else {
    // At a junction (more than 2 available directions), can pick a new direction
    const dirs = getAvailableDirections(ghost.position, newDirection);
    if (dirs.length > 1) {
      if (newLockOn) {
        // Pick direction closest to Pacman
        const angleToPacman = getAngle(ghost.position, pacmanPos);
        newDirection = dirs.reduce((bestDir, dir) => {
          const diff = Math.abs(
            Math.atan2(
              Math.sin(angleToPacman - directionToAngle(dir)),
              Math.cos(angleToPacman - directionToAngle(dir))
            )
          );
          const bestDiff = Math.abs(
            Math.atan2(
              Math.sin(angleToPacman - directionToAngle(bestDir)),
              Math.cos(angleToPacman - directionToAngle(bestDir))
            )
          );
          return diff < bestDiff ? dir : bestDir;
        }, dirs[0]);
      } else {
        newDirection = dirs[Math.floor(Math.random() * dirs.length)];
      }
      nextPos = movePosition(ghost.position, newDirection);
    }
  }

  return {
    ...ghost,
    position: nextPos,
    direction: newDirection,
    lockOn: newLockOn,
    lockOnTimer: newLockOnTimer,
  };
}; 