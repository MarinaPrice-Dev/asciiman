import React from 'react';
import styled from 'styled-components';

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
  padding: 16px;
  border-radius: 10px;
  box-shadow: 0 3px 16px #000a;
  min-width: min(600px, 90vw);
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
`;

const DialogHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  position: sticky;
  top: 0;
  background: #222;
  z-index: 1;
  padding-bottom: 8px;
  border-bottom: 1px solid #444;
`;

const DialogTitle = styled.h2`
  font-size: min(1.5rem, 4vh);
  color: #ffd700;
  margin: 0;
  flex-grow: 1;
  text-align: center;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: #fff;
  font-size: min(1.5rem, 3vh);
  cursor: pointer;
  padding: 4px;
  margin-left: 8px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  
  &:hover {
    background: rgba(255,255,255,0.1);
  }
`;

const PromptsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const PromptItem = styled.div`
  background: #333;
  border-radius: 8px;
  padding: 12px;
  border-left: 4px solid #ffd700;
  
  &:hover {
    background: #3a3a3a;
  }
`;

const PromptNumber = styled.div`
  font-size: min(0.9rem, 2vh);
  color: #ffd700;
  font-weight: bold;
  margin-bottom: 4px;
`;

const PromptText = styled.div`
  font-size: min(0.95rem, 2.2vh);
  line-height: 1.4;
  color: #fff;
`;

const CommitHash = styled.div`
  font-size: min(0.8rem, 1.8vh);
  color: #888;
  margin-top: 6px;
  font-family: monospace;
`;

interface Props {
  onClose: () => void;
}

const commitMessages = [
  "I want to create a game similar to pacman, I would like to have a maze created using ascii characters only so we don't need to use any images. The height and width of the game should always be a pre-set size similar to the original pacman game. I want a character to represent pacman, and to move it around the maze using arrow keys. And I would like 4 different coloured ghosts that automatically chase you around the screen just like the original game. There should be bits of food scattered around the level to collect, and collecting them all should end the game with a success. Being caught by a ghost ends the level with a fail. Pacman can be represented by: C Ghosts: @ Food: . Maze walls: # Walkable parts of the maze can be represented with a space. Pacman and Ghosts should always be placed in the walkable parts of the maze Lets use Vite, React and Rotjs to do this and anything else you recommend",
  "when pacman moves around, he should eat the food (.), they will be replace with an empty space",
  "the ghosts should be free to walk around the maze, when walking they will always complete the path they are on until they hit a wall, or there is a gap in a wall they are walking past, then they can pick a new direction. they will only follow pacman when he is visible to them on the same path (represented by spaces and .). Once a ghost sees pacman, they will lock onto him and follow him",
  "the ghosts should never overlap",
  "this part of the maze should allow pacman and the ghosts to travel to the far right of the maze and appear on the far left, and vice versa",
  "lets add a timer function, and remember best scores and time using local storage",
  "remember the best score and time even when you lose, allow the user to restart after a win or loss. the win/lose message and continue button should appear in a dialog",
  "each ghost needs a seperate personality. whenever a ghost sees pacman they should follow pacman (even if they cant see his path) for at least 6, 10, 12 or 15 seconds based on the ghost. each one should have its own time based on its personality",
  "add the current movement speed being used by the ghosts to this part of the code, and use this number to control the ghosts speed",
  "when a ghost is following pacman and they cant see pacman, at the end of their current direction, they should pick a new direction based on one which is more likely to bring them closer to pacman. Try to calculate this based on the angle of degree of pacmans current position relative to the ghost, and pick a directions that is closest to the angle of degree to pacman",
  "when the ghost is locked on, make them blink visually so it looks angry",
  "Improve UI layout: add header, stats row, card container, and modernize styles for game and dialogs",
  "Reduce margin and padding for compact, scrollbar-free game layout",
  "Set fixed widths for Timer, Score, and BestStats to prevent board resizing with high digit counts",
  "Update title to AsciiMan",
  "Save last score and timer on win/lose; update best score/time only if new score is higher",
  "ReadMe",
  "ReadMe",
  "Add or update the Azure App Service build and deployment workflow config",
  "Update workflow to deploy only Vite build output (dist) to Azure Web App",
  "manual change: fix workflow",
  "Lets add an easy, medium and hard mode. This should be selectable in the UI. For easy mode the current settings are fine.",
  "manual change: adjust difficulties",
  "Lets add insane mode Insane: { foodScore: 20, ghosts: [ { position: { x: 13, y: 13 }, color: '#ff0000', name: 'Blinky', lockOnDuration: 30, lockOnTimer: 0, speed: 180, lastMoved: 0 }, { position: { x: 14, y: 13 }, color: '#ffb8ff', name: 'Pinky', lockOnDuration: 30, lockOnTimer: 0, speed: 200, lastMoved: 0 }, { position: { x: 13, y: 14 }, color: '#00ffff', name: 'Inky', lockOnDuration: 20, lockOnTimer: 0, speed: 250, lastMoved: 0 }, { position: { x: 14, y: 14 }, color: '#ffb852', name: 'Clyde', lockOnDuration: 20, lockOnTimer: 0, speed: 250, lastMoved: 0 }, ] as Ghost[], },",
  "Lets add ● for special food, there should only be four in the maze, and the food score for this is dependant on level. Easy: 50, Medium: 60, Hard: 75, Insane: 100",
  "Pacman should not die when invincible, at the moment the game ends with game over when eating a ghost while invincible or a ghost catches pacman while invincible",
  "manual change: change invincibility timer",
  "I want to upload some data to my mongo db in azure. The data will contain the following fields: Name: \"Rex\" Score: 1234 Time: 64 Mode: \"Hard\"",
  "mongodb.js?v=749a2a24:7499 Uncaught TypeError: (0 , util_1.promisify) is not a function at node_modules/mongodb/lib/utils.js (mongodb.js?v=749a2a24:7499:48) at __require2 (chunk-PLDDJCW6.js?v=749a2a24:17:17) at node_modules/mongodb/lib/timeout.js (mongodb.js?v=749a2a24:7610:19) at __require2 (chunk-PLDDJCW6.js?v=749a2a24:7951:21) at node_modules/mongodb/lib/operations/execute_operation.js (mongodb.js?v=749a2a24:7951:21) at __require2 (chunk-PLDDJCW6.js?v=749a2a24:30986:31) at node_modules/mongodb/lib/admin.js (mongodb.js?v=749a2a24:30986:31) at __require2 (chunk-PLDDJCW6.js?v=749a2a24:31870:19) at node_modules/mongodb/lib/index.js (mongodb.js?v=749a2a24:31870:19)",
  "Everything should be deployed under the same AppService in Azure, the frontend is already deployed. We need to update the package.json and workflow any anything else to build and deploy the new backend to the same AppService",
  "Does http://localhost:3001/api/scores exist? I cannot GET this when I go to the url",
  "manual change: fixed errors by pasting them into the prompt window",
  "Lets create a score dialog to display the saved scores in mongo. We want a button in the ui to show this top scores dialog. We want the top scores to display: Name, Score, Time, Difficulty",
  "manual commit: adjust difficulty",
  "manual change: fix build issues by pasting error into prompt",
  "the app has deployed successfully to prod, but I cant reach the site. it times out: 504.0 GatewayTimeout",
  "manual change: fix build issues",
  "Update build configuration and deployment workflow",
  "Update build configuration and deployment workflow",
  "manual commit: cleanup builds",
  "manual commit: cleanup builds",
  "In the game over/win menu, display the current time and score under the name textbox. Change the High Scores button to say something like Global High Scores",
  "are there any potential security vulnerabilities for a production ready app? Is the name textbox safe? Any other vulnerabilities?",
  "how can me make this friendlier for desktop with lower screen resolution? we never want a scrollbar",
  "build fixes",
  "manual change: better responsiveness",
  "manual commit: changed difficulty",
  "Add difficulty filtering to global scores dialog - Modified /api/scores endpoint to support query parameters for difficulty filtering - Updated ScoresDialog to fetch fresh scores from server when difficulty filter changes - Server now returns top 10 scores for specific difficulty when filter is applied - Maintains existing behavior for 'all' filter (top 10 global scores) - Removed client-side filtering since server now handles it",
  "manual change: improve maze",
  "Fix difficulty filtering in deployed server files - Added difficulty query parameter support to all production server files - Updated dist-server/prod.js, dist-server/index.js, dist-server/prod.ts - Updated dist-server/server/prod.js, dist-server/server/index.js - Now deployed version properly filters scores by difficulty level - Maintains backward compatibility with 'all' filter showing global top 10",
  "Refactor: consolidate all server logic into server/index.ts, remove duplication, update build and deployment scripts. All server logic is now in server/index.ts. Build outputs to dist-server/server.js. web.config and scripts updated to use new structure. Deleted all old/dead server files. Much simpler, safer, and easier to maintain."
];

const commitHashes = [
  "c31052d", "72bceea", "0d9cbfd", "8554c7f", "7532ecf", "97a27b3", "5d80b41", "4d5041f", "4a552e3", "7e2aa74",
  "7969816", "f5f0344", "9199935", "ad59cc3", "ff2ab7a", "575d2da", "86760c3", "6333691", "9254a8e", "aee4307",
  "95fd449", "d6448ca", "3a8836b", "aaa8502", "b2706ec", "eb1d973", "6477d38", "b4c9987", "1e34d68", "067a70e",
  "e028540", "e7a4208", "efbc68f", "3d5c36c", "c2883f4", "da53d04", "d21f973", "0f94692", "e156a26", "d9a2907",
  "c79a77c", "29e9472", "b712415", "6e806aa", "24d99e3", "3455592", "613295f", "9200f4f"
];

const AIPromptsDialog: React.FC<Props> = ({ onClose }) => {
  return (
    <DialogOverlay onClick={e => e.target === e.currentTarget && onClose()}>
      <DialogBox>
        <DialogHeader>
          <DialogTitle>🤖 AI Prompts History</DialogTitle>
          <CloseButton onClick={onClose}>×</CloseButton>
        </DialogHeader>
        
        <PromptsList>
          {commitMessages.map((message, index) => (
            <PromptItem key={index}>
              <PromptNumber>Prompt #{index + 1}</PromptNumber>
              <PromptText>{message}</PromptText>
              <CommitHash>{commitHashes[index]}</CommitHash>
            </PromptItem>
          ))}
        </PromptsList>
      </DialogBox>
    </DialogOverlay>
  );
};

export default AIPromptsDialog; 