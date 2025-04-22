'use client';

import { useState, useCallback, useEffect } from 'react';
import GameCanvas from '../components/GameCanvas';
import GameController from '../components/GameController';
import ScoreBoard from '../components/ScoreBoard';
import { GameState, Direction, GameConfig } from '../types/game';

interface LeaderboardEntry {
  player_name: string;
  score: number;
  created_at: string;
}

const initialConfig: GameConfig = {
  gridSize: 20,
  initialSnakeLength: 3,
  initialSpeed: 5,
  speedIncrement: 0.5,
};

const initialGameState: GameState = {
  snake: Array.from({ length: initialConfig.initialSnakeLength }, (_, i) => ({
    x: Math.floor(initialConfig.gridSize / 2) - i,
    y: Math.floor(initialConfig.gridSize / 2),
  })),
  food: { x: 5, y: 5 },
  direction: 'RIGHT',
  score: 0,
  highScore: 0,
  isGameOver: false,
  isPaused: false,
  speed: initialConfig.initialSpeed,
};

export default function Home() {
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [playerName, setPlayerName] = useState('');
  const [isNameSubmitted, setIsNameSubmitted] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const response = await fetch('/api/save-score');
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const handleUpdate = useCallback((newState: Partial<GameState>) => {
    setGameState(prev => {
      const updated = { ...prev, ...newState };
      if (newState.score !== undefined && newState.score > prev.highScore) {
        updated.highScore = newState.score;
      }
      return updated;
    });
  }, []);

  const handleRestart = useCallback(() => {
    setGameState(initialGameState);
  }, []);

  const handleNameSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (playerName.trim()) {
      setIsNameSubmitted(true);
    }
  }, [playerName]);

  const saveScore = useCallback(async () => {
    if (gameState.isGameOver && playerName) {
      setIsLoading(true);
      try {
        const response = await fetch('/api/save-score', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            playerName,
            score: gameState.score,
          }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.details || 'Failed to save score');
        }
        
        console.log('Score saved successfully:', data);
        // 更新排行榜
        await fetchLeaderboard();
      } catch (error) {
        console.error('Error saving score:', error);
        alert('保存分数失败: ' + (error instanceof Error ? error.message : '未知错误'));
      } finally {
        setIsLoading(false);
      }
    }
  }, [gameState.isGameOver, gameState.score, playerName, fetchLeaderboard]);

  useEffect(() => {
    if (gameState.isGameOver) {
      saveScore();
    }
  }, [gameState.isGameOver, saveScore]);

  const renderGame = useCallback((ctx: CanvasRenderingContext2D) => {
    // 绘制食物
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(
      gameState.food.x * 20,
      gameState.food.y * 20,
      20,
      20
    );

    // 绘制蛇
    gameState.snake.forEach((segment, index) => {
      ctx.fillStyle = index === 0 ? '#4CAF50' : '#8BC34A';
      ctx.fillRect(
        segment.x * 20,
        segment.y * 20,
        20,
        20
      );
    });
  }, [gameState]);

  if (!isNameSubmitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-100">
        <h1 className="text-3xl font-bold mb-8">贪吃蛇游戏</h1>
        <form onSubmit={handleNameSubmit} className="flex flex-col items-center gap-4">
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="请输入您的名字"
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            minLength={2}
            maxLength={20}
          />
          <button
            type="submit"
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            开始游戏
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-100">
      <h1 className="text-3xl font-bold mb-8">贪吃蛇游戏</h1>
      <div className="text-lg mb-4">玩家: {playerName}</div>
      
      <ScoreBoard gameState={gameState} onRestart={handleRestart} />
      
      <GameCanvas
        gameState={gameState}
        gridSize={initialConfig.gridSize}
        onRender={renderGame}
      />
      
      <GameController
        gameState={gameState}
        config={initialConfig}
        onUpdate={handleUpdate}
      />
      
      <div className="mt-8 text-gray-600">
        <p>使用方向键控制蛇的移动</p>
        <p>按空格键暂停/继续游戏</p>
      </div>

      <div className="mt-8 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">排行榜</h2>
        {isLoading ? (
          <div className="text-center">加载中...</div>
        ) : (
          <div className="bg-white rounded-lg shadow p-4">
            {leaderboard.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">排名</th>
                    <th className="text-left py-2">玩家</th>
                    <th className="text-right py-2">分数</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, index) => (
                    <tr key={index} className="border-b last:border-0">
                      <td className="py-2">{index + 1}</td>
                      <td className="py-2">{entry.player_name}</td>
                      <td className="py-2 text-right">{entry.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center text-gray-500">暂无记录</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
