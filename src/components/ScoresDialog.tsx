import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import type { GameScore } from '../api/scores';

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
  padding: 24px;
  border-radius: 10px;
  box-shadow: 0 3px 16px #000a;
  min-width: 500px;
  max-width: 90vw;
  position: relative;
`;

const DialogHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
`;

const DialogTitle = styled.h2`
  font-size: 1.5rem;
  color: #ffd700;
  margin: 0;
  flex-grow: 1;
  text-align: center;
`;

const ScoresTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin: 20px 0;
  
  th, td {
    padding: 8px 12px;
    text-align: left;
    border-bottom: 1px solid #444;
  }
  
  th {
    color: #ffd700;
    font-weight: bold;
  }
  
  tr:last-child td {
    border-bottom: none;
  }
  
  tr:hover td {
    background: #333;
  }
`;

const FilterRow = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  justify-content: center;
`;

const FilterButton = styled.button<{ active: boolean }>`
  padding: 6px 12px;
  font-size: 0.9rem;
  border-radius: 4px;
  border: 2px solid ${props => props.active ? '#ffd700' : '#444'};
  background: ${props => props.active ? '#ffd700' : 'transparent'};
  color: ${props => props.active ? '#222' : '#fff'};
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    border-color: #ffd700;
    background: ${props => props.active ? '#ffd700' : 'rgba(255, 215, 0, 0.1)'};
  }
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: #fff;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 4px;
  margin-left: 8px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  
  &:hover {
    background: rgba(255,255,255,0.1);
  }
`;

interface Props {
  onClose: () => void;
}

type DifficultyFilter = 'all' | 'easy' | 'medium' | 'hard' | 'insane';

const ScoresDialog: React.FC<Props> = ({ onClose }) => {
  const [scores, setScores] = useState<GameScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<DifficultyFilter>('all');

  useEffect(() => {
    const fetchScores = async () => {
      try {
        const baseUrl = import.meta.env.DEV ? 'http://localhost:3001' : '';
        const response = await fetch(`${baseUrl}/api/scores`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch scores');
        }
        
        setScores(data.scores);
      } catch (error) {
        console.error('Error fetching scores:', error);
        setError('Failed to load scores');
      } finally {
        setLoading(false);
      }
    };

    fetchScores();
  }, []);

  const filteredScores = scores
    .filter(score => filter === 'all' || score.mode.toLowerCase() === filter)
    .sort((a, b) => b.score - a.score);

  return (
    <DialogOverlay onClick={e => e.target === e.currentTarget && onClose()}>
      <DialogBox>
        <DialogHeader>
          <DialogTitle>🏆 Global High Scores</DialogTitle>
          <CloseButton onClick={onClose}>×</CloseButton>
        </DialogHeader>
        
        <FilterRow>
          {(['all', 'easy', 'medium', 'hard', 'insane'] as DifficultyFilter[]).map(mode => (
            <FilterButton
              key={mode}
              active={filter === mode}
              onClick={() => setFilter(mode)}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </FilterButton>
          ))}
        </FilterRow>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>Loading scores...</div>
        ) : error ? (
          <div style={{ textAlign: 'center', color: 'crimson', padding: '20px' }}>{error}</div>
        ) : (
          <ScoresTable>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Name</th>
                <th>Score</th>
                <th>Time</th>
                <th>Difficulty</th>
              </tr>
            </thead>
            <tbody>
              {filteredScores.map((score, index) => (
                <tr key={index}>
                  <td>#{index + 1}</td>
                  <td>{score.name}</td>
                  <td>{score.score}</td>
                  <td>{score.time}s</td>
                  <td style={{ 
                    color: score.mode === 'insane' ? '#ff3333' : 
                           score.mode === 'hard' ? '#ff9933' :
                           score.mode === 'medium' ? '#ffcc33' : '#33cc33'
                  }}>
                    {score.mode.charAt(0).toUpperCase() + score.mode.slice(1)}
                  </td>
                </tr>
              ))}
              {filteredScores.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>
                    No scores found for this difficulty
                  </td>
                </tr>
              )}
            </tbody>
          </ScoresTable>
        )}
      </DialogBox>
    </DialogOverlay>
  );
};

export default ScoresDialog; 