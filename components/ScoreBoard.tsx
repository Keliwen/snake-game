import { GameState } from '../types/game';

interface ScoreBoardProps {
  gameState: GameState;
  onRestart: () => void;
}

export default function ScoreBoard({ gameState, onRestart }: ScoreBoardProps) {
  return (
    <div className="flex flex-col items-center gap-4 mb-4">
      <div className="flex gap-8">
        <div className="text-center">
          <div className="text-sm text-gray-600">当前分数</div>
          <div className="text-2xl font-bold">{gameState.score}</div>
        </div>
        <div className="text-center">
          <div className="text-sm text-gray-600">最高分</div>
          <div className="text-2xl font-bold">{gameState.highScore}</div>
        </div>
      </div>
      
      {gameState.isGameOver && (
        <button
          onClick={onRestart}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          重新开始
        </button>
      )}
      
      {!gameState.isGameOver && gameState.isPaused && (
        <div className="text-lg text-gray-600">游戏已暂停</div>
      )}
    </div>
  );
} 