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
    { position: { x: 13, y: 13 }, color: '#ff0000', name: 'Blinky' },
    { position: { x: 14, y: 13 }, color: '#ffb8ff', name: 'Pinky' },
    { position: { x: 13, y: 14 }, color: '#00ffff', name: 'Inky' },
    { position: { x: 14, y: 14 }, color: '#ffb852', name: 'Clyde' },
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

export const moveGhost = (ghost: Ghost, pacmanPos: Position): Ghost => {
  const { direction, lockOn } = ghost;
  let newDirection = direction;
  let newLockOn = lockOn;

  // Check if Pacman is visible
  const visibleDir = isPacmanVisible(ghost, pacmanPos);
  if (visibleDir) {
    newDirection = visibleDir;
    newLockOn = true;
  } else if (lockOn) {
    // Lost sight of Pacman
    newLockOn = false;
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
      newDirection = dirs[Math.floor(Math.random() * dirs.length)];
      nextPos = movePosition(ghost.position, newDirection);
    } else {
      // Stuck, stay in place
      nextPos = ghost.position;
    }
  } else {
    // At a junction (more than 2 available directions), can pick a new direction
    const dirs = getAvailableDirections(ghost.position, newDirection);
    if (dirs.length > 1) {
      // If locked on, keep following Pacman
      if (!newLockOn) {
        newDirection = dirs[Math.floor(Math.random() * dirs.length)];
        nextPos = movePosition(ghost.position, newDirection);
      }
    }
  }

  return {
    ...ghost,
    position: nextPos,
    direction: newDirection,
    lockOn: newLockOn,
  };
}; 