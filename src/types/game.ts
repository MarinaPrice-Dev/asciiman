export type Position = {
  x: number;
  y: number;
};

export type Direction = 'up' | 'down' | 'left' | 'right';

export type Ghost = {
  position: Position;
  color: string;
  name: string;
  direction?: Direction;
  lockOn?: boolean;
  lockOnTimer?: number;
  lockOnDuration?: number;
  speed?: number; // ms per move
  lastMoved?: number; // timestamp
};

export type GameState = {
  pacman: Position;
  ghosts: Ghost[];
  food: Position[];
  specialFood: Position[];
  score: number;
  gameOver: boolean;
  won: boolean;
  isInvincible: boolean;
  invincibleTimer?: number;
};

export const GAME_WIDTH = 28;
export const GAME_HEIGHT = 31;

export const COLORS = {
  BLINKY: '#ff0000',
  PINKY: '#ffb8ff',
  INKY: '#00ffff',
  CLYDE: '#ffb852',
  WALL: '#2121ff',
  FOOD: '#ffb8ff',
  PACMAN: '#ffff00',
}; 