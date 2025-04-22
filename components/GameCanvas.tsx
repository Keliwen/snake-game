import { useEffect, useRef } from 'react';
import { GameState, Position } from '../types/game';

interface GameCanvasProps {
  gameState: GameState;
  gridSize: number;
  onRender: (ctx: CanvasRenderingContext2D) => void;
}

export default function GameCanvas({ gameState, gridSize, onRender }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置画布大小
    const canvasSize = gridSize * 20; // 每个格子20像素
    canvas.width = canvasSize;
    canvas.height = canvasSize;

    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制网格背景
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制网格线
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= gridSize; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 20, 0);
      ctx.lineTo(i * 20, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * 20);
      ctx.lineTo(canvas.width, i * 20);
      ctx.stroke();
    }

    // 调用渲染函数
    onRender(ctx);
  }, [gameState, gridSize, onRender]);

  return (
    <canvas
      ref={canvasRef}
      className="border border-gray-300 rounded-lg shadow-lg"
    />
  );
} 