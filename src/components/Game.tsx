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

const Header = styled.h1`
  font-size: 2.8rem;
  font-weight: bold;
  letter-spacing: 2px;
  margin-bottom: 24px;
  color: #ffd700;
  text-shadow: 2px 2px 8px #000a;
`;

const StatsRow = styled.div`
  display: flex;
  flex-direction: row;
  gap: 32px;
  justify-content: center;
  align-items: center;
  margin-bottom: 18px;
`;

const GameCard = styled.div`
  background: #181818;
  border-radius: 18px;
  box-shadow: 0 6px 32px #000a;
  padding: 36px 48px 32px 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 380px;
`;

const GameBoard = styled.pre`
  line-height: 1;
  letter-spacing: 2px;
  margin: 0;
  font-size: 24px;
  background: #111;
  border-radius: 10px;
  padding: 18px 16px 12px 16px;
  box-shadow: 0 2px 12px #0006;
`;

const Score = styled.div`
  font-size: 1.7rem;
  font-weight: bold;
  color: #ffd700;
`;

const Timer = styled.div`
  font-size: 1.3rem;
  color: #fff;
`;

const BestStats = styled.div`
  font-size: 1.1rem;
  color: #aaa;
`;

const GameMessage = styled.div`
  font-size: 2.2rem;
  color: ${props => props.color};
  margin-top: 18px;
  font-weight: bold;
  text-align: center;
`;

const DialogOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const DialogBox = styled.div`
  background: #222;
  color: #fff;
  padding: 40px 56px;
  border-radius: 18px;
  box-shadow: 0 8px 40px #000a;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 320px;
`;

const DialogButton = styled.button`
  margin-top: 32px;
  padding: 14px 38px;
  font-size: 1.3rem;
  border-radius: 10px;
  border: none;
  background: #ffd700;
  color: #222;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;
  box-shadow: 0 2px 8px #0004;
  &:hover {
    background: #ffe066;
    transform: translateY(-2px) scale(1.04);
  }
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
  const [showDialog, setShowDialog] = useState(false);
  const [dialogType, setDialogType] = useState<'win' | 'lose' | null>(null);
  const [blink, setBlink] = useState(false);

  const moveGhosts = useCallback(() => {
    setGameState(prevState => {
      const now = Date.now();
      const occupied = new Set<string>();
      const newGhosts = [];
      for (let idx = 0; idx < prevState.ghosts.length; idx++) {
        const ghost = prevState.ghosts[idx];
        // Add already-moved ghosts' positions to occupied
        newGhosts.forEach(g => occupied.add(`${g.position.x},${g.position.y}`));
        // Only move if enough time has passed
        if (!ghost.lastMoved || !ghost.speed || now - ghost.lastMoved >= ghost.speed) {
          let movedGhost = moveGhost(ghost, prevState.pacman);
          movedGhost.lastMoved = now;
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
                movedGhost = { ...altGhost, lastMoved: now };
                break;
              }
            }
            tries++;
            if (tries >= 4) {
              movedGhost = { ...ghost, lastMoved: now };
              break;
            }
          }
          occupied.add(`${movedGhost.position.x},${movedGhost.position.y}`);
          newGhosts.push(movedGhost);
        } else {
          // Not time to move yet
          occupied.add(`${ghost.position.x},${ghost.position.y}`);
          newGhosts.push(ghost);
        }
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
    const ghostInterval = setInterval(moveGhosts, 100);
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
      intervalRef.current = window.setInterval(() => {
        setTimer(t => t + 1);
        setGameState(prevState => {
          const newGhosts = prevState.ghosts.map(ghost => {
            if (ghost.lockOn && ghost.lockOnTimer && ghost.lockOnTimer > 0) {
              const newTimer = ghost.lockOnTimer - 1;
              return {
                ...ghost,
                lockOnTimer: newTimer,
                lockOn: newTimer > 0,
              };
            }
            return ghost;
          });
          return { ...prevState, ghosts: newGhosts };
        });
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

  // Update best score/time on win or loss
  useEffect(() => {
    if (gameState.won || gameState.gameOver) {
      if (gameState.score > bestScore) {
        setBestScore(gameState.score);
        localStorage.setItem('bestScore', String(gameState.score));
      }
      if (timer < bestTime || bestTime === 0) {
        setBestTime(timer);
        localStorage.setItem('bestTime', String(timer));
      }
      setShowDialog(true);
      setDialogType(gameState.won ? 'win' : 'lose');
    }
  }, [gameState.won, gameState.gameOver, gameState.score, timer, bestScore, bestTime]);

  // Dialog: restart game
  const handleRestart = () => {
    setGameState({
      pacman: { x: 14, y: 23 },
      ghosts: getInitialGhostPositions(),
      food: getInitialFood(),
      score: 0,
      gameOver: false,
      won: false,
    });
    setTimer(0);
    setShowDialog(false);
    setDialogType(null);
  };

  // Blink effect for angry ghosts
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlink(b => !b);
    }, 300);
    return () => clearInterval(blinkInterval);
  }, []);

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
            if (ghost) {
              if (ghost.lockOn && blink) {
                color = '#fff'; // Blinking angry (white)
              } else {
                color = ghost.color;
              }
            }
          }
          return <span style={{ color }}>{cell}</span>;
        })}
        {'\n'}
      </span>
    ));
  };

  return (
    <GameContainer>
      <Header>AsciiMan</Header>
      <GameCard>
        <StatsRow>
          <Timer>⏱️ {timer}s</Timer>
          <Score>Score: {gameState.score}</Score>
          <BestStats>🏆 Best: {bestScore} | ⏲️ {bestTime === 0 ? '-' : bestTime + 's'}</BestStats>
        </StatsRow>
        <GameBoard>{renderGame()}</GameBoard>
        {showDialog && (
          <DialogOverlay>
            <DialogBox>
              <GameMessage color={dialogType === 'win' ? 'limegreen' : 'crimson'}>
                {dialogType === 'win' ? '🎉 You Won!' : '💀 Game Over!'}
              </GameMessage>
              <DialogButton onClick={handleRestart}>Continue</DialogButton>
            </DialogBox>
          </DialogOverlay>
        )}
      </GameCard>
    </GameContainer>
  );
};

export default Game; 