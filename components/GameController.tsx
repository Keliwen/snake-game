import { useEffect, useCallback, useRef } from 'react';
import { GameState, Direction, Position, GameConfig } from '../types/game';

interface GameControllerProps {
  gameState: GameState;
  config: GameConfig;
  onUpdate: (newState: Partial<GameState>) => void;
}

export default function GameController({ gameState, config, onUpdate }: GameControllerProps) {
  const gameLoopRef = useRef<number | undefined>(undefined);
  const lastUpdateTimeRef = useRef<number>(0);

  // 生成随机食物位置
  const generateFood = useCallback((): Position => {
    let newFood: Position;
    do {
      newFood = {
        x: Math.floor(Math.random() * config.gridSize),
        y: Math.floor(Math.random() * config.gridSize)
      };
    } while (gameState.snake.some(segment => 
      segment.x === newFood.x && segment.y === newFood.y
    ));
    return newFood;
  }, [config.gridSize, gameState.snake]);

  // 检查碰撞
  const checkCollision = useCallback((position: Position, snake: Position[]): boolean => {
    // 检查是否撞墙
    if (
      position.x < 0 ||
      position.x >= config.gridSize ||
      position.y < 0 ||
      position.y >= config.gridSize
    ) {
      return true;
    }

    // 检查是否撞到自己
    return snake.some(segment => segment.x === position.x && segment.y === position.y);
  }, [config.gridSize]);

  // 游戏主循环
  const gameLoop = useCallback((timestamp: number) => {
    if (gameState.isPaused || gameState.isGameOver) {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    const elapsed = timestamp - lastUpdateTimeRef.current;
    if (elapsed < 1000 / gameState.speed) {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    lastUpdateTimeRef.current = timestamp;

    // 计算新的蛇头位置
    const head = { ...gameState.snake[0] };
    switch (gameState.direction) {
      case 'UP':
        head.y -= 1;
        break;
      case 'DOWN':
        head.y += 1;
        break;
      case 'LEFT':
        head.x -= 1;
        break;
      case 'RIGHT':
        head.x += 1;
        break;
    }

    // 检查碰撞
    if (checkCollision(head, gameState.snake)) {
      onUpdate({ isGameOver: true });
      return;
    }

    // 移动蛇
    const newSnake = [head];
    if (head.x === gameState.food.x && head.y === gameState.food.y) {
      // 吃到食物
      newSnake.push(...gameState.snake);
      onUpdate({
        snake: newSnake,
        food: generateFood(),
        score: gameState.score + 1,
        speed: gameState.speed + config.speedIncrement,
      });
    } else {
      // 正常移动
      newSnake.push(...gameState.snake.slice(0, -1));
      onUpdate({ snake: newSnake });
    }

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, config, onUpdate, checkCollision, generateFood]);

  // 处理键盘输入
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState.isGameOver) return;

      let newDirection: Direction | null = null;
      switch (e.key) {
        case 'ArrowUp':
          if (gameState.direction !== 'DOWN') newDirection = 'UP';
          break;
        case 'ArrowDown':
          if (gameState.direction !== 'UP') newDirection = 'DOWN';
          break;
        case 'ArrowLeft':
          if (gameState.direction !== 'RIGHT') newDirection = 'LEFT';
          break;
        case 'ArrowRight':
          if (gameState.direction !== 'LEFT') newDirection = 'RIGHT';
          break;
        case ' ':
          onUpdate({ isPaused: !gameState.isPaused });
          break;
      }

      if (newDirection) {
        onUpdate({ direction: newDirection });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState.direction, gameState.isGameOver, gameState.isPaused, onUpdate]);

  // 启动游戏循环
  useEffect(() => {
    gameLoopRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameLoop]);

  return null;
} 