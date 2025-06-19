import React, { useEffect, useCallback, useState, useRef } from 'react';
import styled from 'styled-components';
import type { GameState, Direction, Ghost } from '../types/game';
import { COLORS } from '../types/game';
import { MAZE_LAYOUT } from '../constants/maze';
import { submitScore, sanitizeName } from '../api/scores';
import ScoresDialog from './ScoresDialog';
import {
  isValidPosition,
  movePosition,
  getInitialFood,
  moveGhost,
} from '../utils/gameUtils';

type Difficulty = 'easy' | 'medium' | 'hard' | 'insane';

const DIFFICULTY_CONFIGS = {
  easy: {
    foodScore: 10,
    specialFoodScore: 50,
    ghosts: [
      { position: { x: 13, y: 13 }, color: '#ff0000', name: 'Blinky', lockOnDuration: 15, lockOnTimer: 0, speed: 300, lastMoved: 0 },
      { position: { x: 14, y: 13 }, color: '#ffb8ff', name: 'Pinky', lockOnDuration: 12, lockOnTimer: 0, speed: 300, lastMoved: 0 },
      { position: { x: 13, y: 14 }, color: '#00ffff', name: 'Inky', lockOnDuration: 10, lockOnTimer: 0, speed: 400, lastMoved: 0 },
      { position: { x: 14, y: 14 }, color: '#ffb852', name: 'Clyde', lockOnDuration: 6, lockOnTimer: 0, speed: 400, lastMoved: 0 },
    ] as Ghost[],
  },
  medium: {
    foodScore: 12,
    specialFoodScore: 60,
    ghosts: [
      { position: { x: 13, y: 13 }, color: '#ff0000', name: 'Blinky', lockOnDuration: 25, lockOnTimer: 0, speed: 250, lastMoved: 0 },
      { position: { x: 14, y: 13 }, color: '#ffb8ff', name: 'Pinky', lockOnDuration: 20, lockOnTimer: 0, speed: 250, lastMoved: 0 },
      { position: { x: 13, y: 14 }, color: '#00ffff', name: 'Inky', lockOnDuration: 12, lockOnTimer: 0, speed: 350, lastMoved: 0 },
      { position: { x: 14, y: 14 }, color: '#ffb852', name: 'Clyde', lockOnDuration: 10, lockOnTimer: 0, speed: 350, lastMoved: 0 },
    ] as Ghost[],
  },
  hard: {
    foodScore: 15,
    specialFoodScore: 75,
    ghosts: [
      { position: { x: 13, y: 13 }, color: '#ff0000', name: 'Blinky', lockOnDuration: 25, lockOnTimer: 0, speed: 230, lastMoved: 0 },
      { position: { x: 14, y: 13 }, color: '#ffb8ff', name: 'Pinky', lockOnDuration: 25, lockOnTimer: 0, speed: 230, lastMoved: 0 },
      { position: { x: 13, y: 14 }, color: '#00ffff', name: 'Inky', lockOnDuration: 15, lockOnTimer: 0, speed: 300, lastMoved: 0 },
      { position: { x: 14, y: 14 }, color: '#ffb852', name: 'Clyde', lockOnDuration: 12, lockOnTimer: 0, speed: 300, lastMoved: 0 },
    ] as Ghost[],
  },
  insane: {
    foodScore: 20,
    specialFoodScore: 100,
    ghosts: [
      { position: { x: 13, y: 13 }, color: '#ff0000', name: 'Blinky', lockOnDuration: 30, lockOnTimer: 0, speed: 180, lastMoved: 0 },
      { position: { x: 14, y: 13 }, color: '#ffb8ff', name: 'Pinky', lockOnDuration: 30, lockOnTimer: 0, speed: 200, lastMoved: 0 },
      { position: { x: 13, y: 14 }, color: '#00ffff', name: 'Inky', lockOnDuration: 20, lockOnTimer: 0, speed: 250, lastMoved: 0 },
      { position: { x: 14, y: 14 }, color: '#ffb852', name: 'Clyde', lockOnDuration: 20, lockOnTimer: 0, speed: 250, lastMoved: 0 },
    ] as Ghost[],
  },
};

const SPECIAL_FOOD_POSITIONS = [
  { x: 1, y: 1 },    // Top left
  { x: 26, y: 1 },   // Top right
  { x: 1, y: 29 },   // Bottom left
  { x: 26, y: 29 },  // Bottom right
];

const GameContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 20px 20px 20px;
  background-color: black;
  color: white;
  font-family: monospace;
  min-height: 100vh;
`;

const Header = styled.h1`
  font-size: 2.2rem;
  font-weight: bold;
  letter-spacing: 1px;
  margin-bottom: 12px;
  color: #ffd700;
  text-shadow: 1px 1px 4px #000a;
`;

const StatsRow = styled.div`
  display: flex;
  flex-direction: row;
  gap: 16px;
  justify-content: center;
  align-items: center;
  margin-bottom: 8px;
`;

const GameCard = styled.div`
  background: #181818;
  border-radius: 12px;
  box-shadow: 0 3px 16px #000a;
  padding: 18px 12px 12px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
`;

const GameBoard = styled.pre`
  line-height: 1;
  letter-spacing: 1.5px;
  margin: 0;
  font-size: 18px;
  background: #111;
  border-radius: 6px;
  padding: 8px 4px 4px 4px;
  box-shadow: 0 1px 6px #0006;
`;

const Score = styled.div`
  font-size: 1.2rem;
  font-weight: bold;
  color: #ffd700;
  width: 140px;
  text-align: left;
`;

const Timer = styled.div`
  font-size: 1rem;
  color: #fff;
  width: 75px;
  text-align: left;
`;

const BestStats = styled.div`
  font-size: 0.95rem;
  color: #aaa;
  width: 220px;
  text-align: center;
`;

const GameMessage = styled.div`
  font-size: 1.3rem;
  color: ${props => props.color};
  margin-top: 10px;
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
  padding: 18px 18px;
  border-radius: 10px;
  box-shadow: 0 3px 16px #000a;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 180px;
`;

const DialogButton = styled.button`
  margin-top: 16px;
  padding: 8px 18px;
  font-size: 1rem;
  border-radius: 6px;
  border: none;
  background: #ffd700;
  color: #222;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;
  box-shadow: 0 1px 4px #0004;
  &:hover {
    background: #ffe066;
    transform: translateY(-1px) scale(1.03);
  }
`;

const DifficultySelector = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  align-items: center;
`;

const DifficultyButton = styled.button<{ active: boolean; insane?: boolean }>`
  padding: 6px 12px;
  font-size: 0.9rem;
  border-radius: 4px;
  border: 2px solid ${props => props.active ? (props.insane ? '#ff3333' : '#ffd700') : '#444'};
  background: ${props => props.active ? (props.insane ? '#ff3333' : '#ffd700') : 'transparent'};
  color: ${props => props.active ? (props.insane ? '#fff' : '#222') : '#fff'};
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
  &:hover {
    border-color: ${props => props.insane ? '#ff3333' : '#ffd700'};
    background: ${props => props.active ? (props.insane ? '#ff3333' : '#ffd700') : props.insane ? 'rgba(255, 51, 51, 0.1)' : 'rgba(255, 215, 0, 0.1)'};
  }
`;

const DifficultyLabel = styled.span`
  font-size: 0.9rem;
  color: #aaa;
  margin-right: 8px;
`;

const DialogInput = styled.input`
  margin: 12px 0;
  padding: 8px 12px;
  font-size: 1rem;
  border-radius: 6px;
  border: 2px solid #444;
  background: #333;
  color: #fff;
  width: 200px;
  &:focus {
    border-color: #ffd700;
    outline: none;
  }
`;

const DialogButtonRow = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 16px;
`;

const ScoresButton = styled.button`
  position: absolute;
  top: 20px;
  right: 20px;
  padding: 8px 16px;
  font-size: 1rem;
  border-radius: 6px;
  border: 2px solid #ffd700;
  background: transparent;
  color: #ffd700;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(255, 215, 0, 0.1);
    transform: translateY(-1px);
  }
`;

const Game: React.FC = () => {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('playerName') || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showScores, setShowScores] = useState(false);
  const [gameState, setGameState] = useState<GameState>({
    pacman: { x: 14, y: 23 }, // Initial Pacman position
    ghosts: DIFFICULTY_CONFIGS[difficulty].ghosts,
    food: getInitialFood(),
    specialFood: SPECIAL_FOOD_POSITIONS,
    score: 0,
    gameOver: false,
    won: false,
    isInvincible: false,
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
      const collidingGhostIndex = newGhosts.findIndex(
        ghost =>
          ghost.position.x === prevState.pacman.x &&
          ghost.position.y === prevState.pacman.y
      );

      // Handle ghost collision based on invincibility
      if (collidingGhostIndex !== -1) {
        if (prevState.isInvincible) {
          // Eat the ghost and reset its position
          const ghost = newGhosts[collidingGhostIndex];
          newGhosts[collidingGhostIndex] = {
            ...ghost,
            position: DIFFICULTY_CONFIGS[difficulty].ghosts[collidingGhostIndex].position,
          };

          return {
            ...prevState,
            ghosts: newGhosts,
            score: prevState.score + DIFFICULTY_CONFIGS[difficulty].specialFoodScore, // Points for eating ghost
          };
        } else {
          // Not invincible, game over
          return { ...prevState, gameOver: true, ghosts: newGhosts };
        }
      }

      return { ...prevState, ghosts: newGhosts };
    });
  }, [difficulty]);

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

        // Check for special food collection
        const specialFoodIndex = prevState.specialFood.findIndex(
          f => f.x === newPosition.x && f.y === newPosition.y
        );
        const newSpecialFood = [...prevState.specialFood];
        if (specialFoodIndex !== -1) {
          newSpecialFood.splice(specialFoodIndex, 1);
        }

        // Check for ghost collision
        const collidingGhostIndex = prevState.ghosts.findIndex(
          ghost =>
            ghost.position.x === newPosition.x &&
            ghost.position.y === newPosition.y
        );

        // Handle ghost collision based on invincibility
        if (collidingGhostIndex !== -1) {
          if (prevState.isInvincible) {
            // Eat the ghost and reset its position
            const newGhosts = [...prevState.ghosts];
            const ghost = newGhosts[collidingGhostIndex];
            newGhosts[collidingGhostIndex] = {
              ...ghost,
              position: DIFFICULTY_CONFIGS[difficulty].ghosts[collidingGhostIndex].position,
            };

            return {
              ...prevState,
              pacman: newPosition,
              food: newFood,
              specialFood: newSpecialFood,
              ghosts: newGhosts,
              score: prevState.score + 
                (foodIndex !== -1 ? DIFFICULTY_CONFIGS[difficulty].foodScore : 0) +
                (specialFoodIndex !== -1 ? DIFFICULTY_CONFIGS[difficulty].specialFoodScore : 0) +
                DIFFICULTY_CONFIGS[difficulty].specialFoodScore, // Points for eating ghost
              isInvincible: specialFoodIndex !== -1 ? true : prevState.isInvincible,
            };
          } else {
            // Not invincible, game over
            return { ...prevState, gameOver: true };
          }
        }

        // Check win condition
        if (newFood.length === 0 && newSpecialFood.length === 0) {
          return {
            ...prevState,
            pacman: newPosition,
            food: newFood,
            specialFood: newSpecialFood,
            score: prevState.score + 
              (foodIndex !== -1 ? DIFFICULTY_CONFIGS[difficulty].foodScore : 0) +
              (specialFoodIndex !== -1 ? DIFFICULTY_CONFIGS[difficulty].specialFoodScore : 0),
            won: true,
            isInvincible: specialFoodIndex !== -1 ? true : prevState.isInvincible,
          };
        }

        // No collision, just update position and score
        return {
          ...prevState,
          pacman: newPosition,
          food: newFood,
          specialFood: newSpecialFood,
          score: prevState.score + 
            (foodIndex !== -1 ? DIFFICULTY_CONFIGS[difficulty].foodScore : 0) +
            (specialFoodIndex !== -1 ? DIFFICULTY_CONFIGS[difficulty].specialFoodScore : 0),
          isInvincible: specialFoodIndex !== -1 ? true : prevState.isInvincible,
        };
      });
    },
    [gameState.gameOver, gameState.won, difficulty]
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

  // Update best and last score/time on win or loss
  useEffect(() => {
    if (gameState.won || gameState.gameOver) {
      // Always save last score and timer
      localStorage.setItem('lastScore', String(gameState.score));
      localStorage.setItem('lastTime', String(timer));
      // Only update best score/time if score is higher
      if (gameState.score > bestScore) {
        setBestScore(gameState.score);
        setBestTime(timer);
        localStorage.setItem('bestScore', String(gameState.score));
        localStorage.setItem('bestTime', String(timer));
      }
      setShowDialog(true);
      setDialogType(gameState.won ? 'win' : 'lose');
    }
  }, [gameState.won, gameState.gameOver, gameState.score, timer, bestScore]);

  // Handle invincibility timer
  useEffect(() => {
    if (gameState.isInvincible) {
      const timer = setTimeout(() => {
        setGameState(prevState => ({
          ...prevState,
          isInvincible: false,
          invincibleTimer: undefined,
        }));
      }, 5000); // 5 seconds
      return () => clearTimeout(timer);
    }
  }, [gameState.isInvincible]);

  // Dialog: restart game
  const handleRestart = () => {
    setGameState({
      pacman: { x: 14, y: 23 },
      ghosts: DIFFICULTY_CONFIGS[difficulty].ghosts,
      food: getInitialFood(),
      specialFood: SPECIAL_FOOD_POSITIONS,
      score: 0,
      gameOver: false,
      won: false,
      isInvincible: false,
    });
    setTimer(0);
    setShowDialog(false);
    setDialogType(null);
  };

  const handleDifficultyChange = (newDifficulty: Difficulty) => {
    setDifficulty(newDifficulty);
    setGameState({
      pacman: { x: 14, y: 23 },
      ghosts: DIFFICULTY_CONFIGS[newDifficulty].ghosts,
      food: getInitialFood(),
      specialFood: SPECIAL_FOOD_POSITIONS,
      score: 0,
      gameOver: false,
      won: false,
      isInvincible: false,
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

  // Handle score submission
  const handleSubmitScore = async () => {
    if (!playerName.trim()) return;
    
    setIsSubmitting(true);
    try {
      const sanitizedName = sanitizeName(playerName);
      await submitScore({
        name: sanitizedName,
        score: gameState.score,
        time: timer,
        mode: difficulty
      });
      
      // Save name for future use
      localStorage.setItem('playerName', sanitizedName);
      
      // Close dialog after successful submission
      setShowDialog(false);
      handleRestart();
    } catch (error) {
      console.error('Failed to submit score:', error);
      // You might want to show an error message to the user here
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderGame = () => {
    // Start with the maze layout
    const board = MAZE_LAYOUT.map(row => [...row]);

    // Place food only where it still exists
    gameState.food.forEach(({ x, y }) => {
      board[y][x] = '.';
    });

    // Place special food
    gameState.specialFood.forEach(({ x, y }) => {
      board[y][x] = '●';
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
          if (cell === '●') color = '#ffd700'; // Gold color for special food
          if (cell === 'C') color = COLORS.PACMAN;
          if (cell === '@') {
            const ghost = gameState.ghosts.find(
              g => g.position.x === j && g.position.y === i
            );
            if (ghost) {
              if (gameState.isInvincible) {
                color = '#0077ff'; // Blue color for vulnerable ghosts
              } else if (ghost.lockOn && blink) {
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
      <ScoresButton onClick={() => setShowScores(true)}>
        🏆 High Scores
      </ScoresButton>
      <DifficultySelector>
        <DifficultyLabel>Difficulty:</DifficultyLabel>
        <DifficultyButton
          active={difficulty === 'easy'}
          onClick={() => handleDifficultyChange('easy')}
        >
          Easy
        </DifficultyButton>
        <DifficultyButton
          active={difficulty === 'medium'}
          onClick={() => handleDifficultyChange('medium')}
        >
          Medium
        </DifficultyButton>
        <DifficultyButton
          active={difficulty === 'hard'}
          onClick={() => handleDifficultyChange('hard')}
        >
          Hard
        </DifficultyButton>
        <DifficultyButton
          active={difficulty === 'insane'}
          insane
          onClick={() => handleDifficultyChange('insane')}
        >
          💀 Insane
        </DifficultyButton>
      </DifficultySelector>
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
              <DialogInput
                type="text"
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={20}
              />
              <DialogButtonRow>
                <DialogButton 
                  onClick={handleSubmitScore}
                  disabled={isSubmitting || !playerName.trim()}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Score'}
                </DialogButton>
                <DialogButton onClick={handleRestart}>
                  {isSubmitting ? 'Please wait...' : 'Skip & Continue'}
                </DialogButton>
              </DialogButtonRow>
            </DialogBox>
          </DialogOverlay>
        )}
      </GameCard>
      {showScores && (
        <ScoresDialog onClose={() => setShowScores(false)} />
      )}
    </GameContainer>
  );
};

export default Game; 