export type Position = {
  x: number;
  y: number;
};

export type Direction = 'up' | 'down' | 'left' | 'right';

export type Ghost = {
  position: Position;
  color: string;
  name: string;
};

export type GameState = {
  pacman: Position;
  ghosts: Ghost[];
  food: Position[];
  score: number;
  gameOver: boolean;
  won: boolean;
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