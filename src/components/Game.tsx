import React, { useEffect, useCallback, useState } from 'react';
import styled from 'styled-components';
import type { GameState, Direction } from '../types/game';
import { COLORS } from '../types/game';
import { MAZE_LAYOUT } from '../constants/maze';
import {
  isValidPosition,
  movePosition,
  getInitialFood,
  getInitialGhostPositions,
  moveGhost,
} from '../utils/gameUtils';

const GameContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background-color: black;
  color: white;
  font-family: monospace;
  min-height: 100vh;
`;

const GameBoard = styled.pre`
  line-height: 1;
  letter-spacing: 2px;
  margin: 0;
  font-size: 20px;
`;

const Score = styled.div`
  font-size: 24px;
  margin-bottom: 20px;
`;

const GameMessage = styled.div`
  font-size: 32px;
  color: ${props => props.color};
  margin-top: 20px;
`;

const Game: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    pacman: { x: 14, y: 23 }, // Initial Pacman position
    ghosts: getInitialGhostPositions(),
    food: getInitialFood(),
    score: 0,
    gameOver: false,
    won: false,
  });

  const moveGhosts = useCallback(() => {
    setGameState(prevState => {
      const newGhosts = prevState.ghosts.map(ghost => ({
        ...ghost,
        position: moveGhost(ghost, prevState.pacman),
      }));

      // Check for collision with ghosts
      const collision = newGhosts.some(
        ghost =>
          ghost.position.x === prevState.pacman.x &&
          ghost.position.y === prevState.pacman.y
      );

      if (collision) {
        return { ...prevState, gameOver: true, ghosts: newGhosts };
      }

      return { ...prevState, ghosts: newGhosts };
    });
  }, []);

  useEffect(() => {
    const ghostInterval = setInterval(moveGhosts, 400);
    return () => clearInterval(ghostInterval);
  }, [moveGhosts]);

  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      if (gameState.gameOver || gameState.won) return;

      let direction: Direction;
      switch (event.key) {
        case 'ArrowUp':
          direction = 'up';
          break;
        case 'ArrowDown':
          direction = 'down';
          break;
        case 'ArrowLeft':
          direction = 'left';
          break;
        case 'ArrowRight':
          direction = 'right';
          break;
        default:
          return;
      }

      setGameState(prevState => {
        const newPosition = movePosition(prevState.pacman, direction);
        if (!isValidPosition(newPosition)) return prevState;

        // Check for food collection
        const foodIndex = prevState.food.findIndex(
          f => f.x === newPosition.x && f.y === newPosition.y
        );
        const newFood = [...prevState.food];
        if (foodIndex !== -1) {
          newFood.splice(foodIndex, 1);
        }

        // Check win condition
        if (newFood.length === 0) {
          return {
            ...prevState,
            pacman: newPosition,
            food: newFood,
            score: prevState.score + (foodIndex !== -1 ? 10 : 0),
            won: true,
          };
        }

        // Check ghost collision
        const collision = prevState.ghosts.some(
          ghost =>
            ghost.position.x === newPosition.x &&
            ghost.position.y === newPosition.y
        );

        if (collision) {
          return { ...prevState, gameOver: true };
        }

        return {
          ...prevState,
          pacman: newPosition,
          food: newFood,
          score: prevState.score + (foodIndex !== -1 ? 10 : 0),
        };
      });
    },
    [gameState.gameOver, gameState.won]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  const renderGame = () => {
    const board = MAZE_LAYOUT.map(row => [...row]);

    // Place food
    gameState.food.forEach(({ x, y }) => {
      board[y][x] = '.';
    });

    // Place ghosts
    gameState.ghosts.forEach(ghost => {
      board[ghost.position.y][ghost.position.x] = '@';
    });

    // Place Pacman
    board[gameState.pacman.y][gameState.pacman.x] = 'C';

    return board.map((row, i) => (
      <span key={i}>
        {row.map((cell, j) => {
          let color = 'white';
          if (cell === '#') color = COLORS.WALL;
          if (cell === '.') color = COLORS.FOOD;
          if (cell === 'C') color = COLORS.PACMAN;
          if (cell === '@') {
            const ghost = gameState.ghosts.find(
              g => g.position.x === j && g.position.y === i
            );
            if (ghost) color = ghost.color;
          }
          return <span style={{ color }}>{cell}</span>;
        })}
        {'\n'}
      </span>
    ));
  };

  return (
    <GameContainer>
      <Score>Score: {gameState.score}</Score>
      <GameBoard>{renderGame()}</GameBoard>
      {gameState.gameOver && (
        <GameMessage color="red">Game Over!</GameMessage>
      )}
      {gameState.won && (
        <GameMessage color="green">You Won!</GameMessage>
      )}
    </GameContainer>
  );
};

export default Game; 