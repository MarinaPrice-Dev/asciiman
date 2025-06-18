import React, { useEffect, useCallback, useState, useRef } from 'react';
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

const Timer = styled.div`
  font-size: 20px;
  margin-bottom: 10px;
`;

const BestStats = styled.div`
  font-size: 18px;
  margin-bottom: 10px;
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

  const [timer, setTimer] = useState(0);
  const [bestScore, setBestScore] = useState<number>(() => Number(localStorage.getItem('bestScore')) || 0);
  const [bestTime, setBestTime] = useState<number>(() => Number(localStorage.getItem('bestTime')) || 0);
  const intervalRef = useRef<number | null>(null);

  const moveGhosts = useCallback(() => {
    setGameState(prevState => {
      const occupied = new Set<string>();
      const newGhosts = [];
      for (let idx = 0; idx < prevState.ghosts.length; idx++) {
        const ghost = prevState.ghosts[idx];
        // Add already-moved ghosts' positions to occupied
        newGhosts.forEach(g => occupied.add(`${g.position.x},${g.position.y}`));
        // Try to move the ghost
        let movedGhost = moveGhost(ghost, prevState.pacman);
        let tries = 0;
        // If the new position is occupied, try up to 4 alternative directions
        while (
          occupied.has(`${movedGhost.position.x},${movedGhost.position.y}`) &&
          tries < 4
        ) {
          const altDirs = ['up', 'down', 'left', 'right'].filter(
            d => d !== movedGhost.direction
          ) as Direction[];
          for (const dir of altDirs) {
            const altGhost = moveGhost({ ...ghost, direction: dir }, prevState.pacman);
            if (!occupied.has(`${altGhost.position.x},${altGhost.position.y}`)) {
              movedGhost = altGhost;
              break;
            }
          }
          tries++;
          if (tries >= 4) {
            movedGhost = { ...ghost };
            break;
          }
        }
        occupied.add(`${movedGhost.position.x},${movedGhost.position.y}`);
        newGhosts.push(movedGhost);
      }

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

  // Timer effect
  useEffect(() => {
    if (!gameState.gameOver && !gameState.won) {
      intervalRef.current = setInterval(() => {
        setTimer(t => t + 1);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [gameState.gameOver, gameState.won]);

  // Reset timer on new game
  useEffect(() => {
    setTimer(0);
  }, []);

  // Update best score/time on win
  useEffect(() => {
    if (gameState.won) {
      if (gameState.score > bestScore) {
        setBestScore(gameState.score);
        localStorage.setItem('bestScore', String(gameState.score));
      }
      if (timer < bestTime || bestTime === 0) {
        setBestTime(timer);
        localStorage.setItem('bestTime', String(timer));
      }
    }
  }, [gameState.won, gameState.score, timer, bestScore, bestTime]);

  const renderGame = () => {
    // Start with the maze layout
    const board = MAZE_LAYOUT.map(row => [...row]);

    // Place food only where it still exists
    gameState.food.forEach(({ x, y }) => {
      board[y][x] = '.';
    });

    // Remove dots from the maze where food has been eaten
    for (let y = 0; y < board.length; y++) {
      for (let x = 0; x < board[y].length; x++) {
        if (MAZE_LAYOUT[y][x] === '.' && !gameState.food.some(f => f.x === x && f.y === y)) {
          board[y][x] = ' ';
        }
      }
    }

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
      <Timer>Time: {timer}s</Timer>
      <BestStats>Best Score: {bestScore} | Best Time: {bestTime === 0 ? '-' : bestTime + 's'}</BestStats>
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