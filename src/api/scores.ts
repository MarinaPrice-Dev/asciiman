/// <reference types="vite/client" />

export interface GameScore {
  name: string;
  score: number;
  time: number;
  mode: string;
  timestamp: Date;
}

interface ServerError {
  details?: string;
  error?: string;
}

// Sanitize name to only allow alphanumeric characters
export const sanitizeName = (name: string): string => {
  return name.replace(/[^a-zA-Z0-9]/g, '');
};

// Submit score to backend API
export const submitScore = async (scoreData: Omit<GameScore, 'timestamp'>): Promise<void> => {
  try {
    console.log('Submitting score:', { ...scoreData, name: '[REDACTED]' });
    
    // In development, use localhost. In production, use relative path
    const baseUrl = import.meta.env.DEV ? 'http://localhost:3001' : '';
    const response = await fetch(`${baseUrl}/api/scores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(scoreData),
    });

    const data = await response.json() as ServerError;

    if (!response.ok) {
      console.error('Server response:', data);
      throw new Error(data.details || data.error || 'Failed to submit score');
    }
  } catch (error) {
    console.error('Error submitting score:', error);
    throw error;
  }
}; 