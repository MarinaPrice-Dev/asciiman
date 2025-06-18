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
  switch (direction) {
    case 'up':
      newPosition.y -= 1;
      break;
    case 'down':
      newPosition.y += 1;
      break;
    case 'left':
      newPosition.x -= 1;
      break;
    case 'right':
      newPosition.x += 1;
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

export const moveGhost = (ghost: Ghost, pacmanPos: Position): Position => {
  // Simple ghost AI: Move towards Pacman with some randomness
  const possibleMoves: Position[] = [
    { x: ghost.position.x - 1, y: ghost.position.y },
    { x: ghost.position.x + 1, y: ghost.position.y },
    { x: ghost.position.x, y: ghost.position.y - 1 },
    { x: ghost.position.x, y: ghost.position.y + 1 },
  ].filter(isValidPosition);

  if (possibleMoves.length === 0) return ghost.position;

  // Sometimes move randomly to make the ghosts less predictable
  if (Math.random() < 0.3) {
    return possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
  }

  // Otherwise, move towards Pacman
  return possibleMoves.reduce((closest, move) => {
    const currentDistance = Math.abs(move.x - pacmanPos.x) + Math.abs(move.y - pacmanPos.y);
    const closestDistance = Math.abs(closest.x - pacmanPos.x) + Math.abs(closest.y - pacmanPos.y);
    return currentDistance < closestDistance ? move : closest;
  });
}; 