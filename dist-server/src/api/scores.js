export const sanitizeName = (name) => {
    return name.replace(/[^a-zA-Z0-9]/g, '');
};
export const submitScore = async (scoreData) => {
    try {
        console.log('Submitting score:', { ...scoreData, name: '[REDACTED]' });
        const baseUrl = import.meta.env.DEV ? 'http://localhost:3001' : '';
        const response = await fetch(`${baseUrl}/api/scores`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(scoreData),
        });
        const data = await response.json();
        if (!response.ok) {
            console.error('Server response:', data);
            throw new Error(data.details || data.error || 'Failed to submit score');
        }
    }
    catch (error) {
        console.error('Error submitting score:', error);
        throw error;
    }
};
